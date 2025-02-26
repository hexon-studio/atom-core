import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { BN } from "bn.js";
import {
	Effect,
	Array as EffectArray,
	Option,
	Record,
	identity,
	pipe,
} from "effect";
import { constNull } from "effect/Function";
import {
	getFleetAccount,
	getFleetAccountByNameOrAddress,
} from "~/libs/@staratlas/sage";
import {
	LoadUnloadFailedError,
	LoadUnloadPartiallyFailedError,
} from "../../errors";
import {
	type CargoPodKind,
	type UnloadResourceInput,
	cargoPodKinds,
} from "../../utils/decoders";
import { createWithdrawCargoFromFleetIx } from "../fleet/instructions";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import {
	type CargoPodsDifference,
	getCargoPodsResourcesDifference,
} from "../fleet/utils/getCargoPodsResourcesDifference";
import { getFleetCargoPodInfosForItems } from "../fleet/utils/getFleetCargoPodInfosForItems";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const unloadCargo = ({
	fleetNameOrAddress,
	items,
}: {
	fleetNameOrAddress: string | PublicKey;
	items: Array<UnloadResourceInput>;
}) =>
	Effect.gen(function* () {
		yield* Effect.log(
			`Unloading cargo from fleet ${fleetNameOrAddress.toString()}`,
		);

		const preFleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const preIxsSignatures = yield* Effect.Do.pipe(
			Effect.bind("preIxs", () =>
				createPreIxs({
					fleetAccount: preFleetAccount,
					targetState: "StarbaseLoadingBay",
				}),
			),
			Effect.bind("afterIxs", () => createAfterIxs()),
			Effect.flatMap(({ preIxs, afterIxs }) =>
				GameService.buildAndSignTransaction({
					ixs: preIxs,
					afterIxs,
					size: maxIxsPerTransaction,
				}),
			),
			Effect.flatMap((txs) =>
				Effect.all(txs.map((tx) => GameService.sendTransaction(tx))),
			),
			Effect.tap((signatures) =>
				Effect.log("Fleet docked to starbase.").pipe(
					Effect.annotateLogs({ signatures }),
				),
			),
		);

		yield* Effect.sleep("10 seconds");

		const freshFleetAccount = yield* getFleetAccount(preFleetAccount.key);
		const ixs: InstructionReturn[] = [];

		const itemsCargoPodsKinds = [
			...new Set(items.map((item) => item.cargoPodKind)),
		];

		const initialCargoPodsInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodsKinds,
			fleetAccount: freshFleetAccount,
		});

		const unloadCargoIxs = yield* Effect.all(
			EffectArray.filterMap(items, (item) => {
				const cargoPodInfo = initialCargoPodsInfos[item.cargoPodKind];

				if (!cargoPodInfo) {
					return Option.none();
				}

				return Option.some(
					createWithdrawCargoFromFleetIx({
						fleetAccount: freshFleetAccount,
						item: {
							...item,
							cargoPodInfo,
						},
					}),
				);
			}),
		).pipe(Effect.map(EffectArray.flatten));

		if (EffectArray.isEmptyArray(unloadCargoIxs)) {
			yield* Effect.log("Nothing to unload. Skipping");
			return { signatures: [] };
		}

		ixs.push(...unloadCargoIxs);

		const afterIxs = yield* createAfterIxs();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const maybeSignatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx).pipe(Effect.either)),
			{ concurrency: 5 },
		);

		const [errors, signatures] = EffectArray.partitionMap(
			maybeSignatures,
			identity,
		);

		if (EffectArray.isEmptyArray(signatures)) {
			// All transactions failed
			return yield* Effect.fail(new LoadUnloadFailedError({ errors }));
		}

		if (EffectArray.isEmptyArray(errors)) {
			// All transactions succeeded
			return { signatures: [...preIxsSignatures, ...signatures] };
		}

		// Some transactions failed - check differences
		yield* Effect.sleep("10 seconds");

		const postCargoPodsInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodsKinds,
			fleetAccount: freshFleetAccount,
		}).pipe(Effect.orElseSucceed(constNull));

		const differences: Record<CargoPodKind, CargoPodsDifference> = pipe(
			cargoPodKinds,
			EffectArray.map((cargoPodKind) => {
				const resourceMissingItems = pipe(
					Record.difference(
						postCargoPodsInfos?.[cargoPodKind]?.resources ?? {},
						initialCargoPodsInfos?.[cargoPodKind]?.resources ?? {},
					),
					Record.map((item) => ({
						...item,
						amountInCargoUnits: new BN(0),
						amountInTokens: new BN(0),
					})),
				);

				return [
					cargoPodKind,
					getCargoPodsResourcesDifference({
						cargoPodKind,
						after: Record.union(
							postCargoPodsInfos?.[cargoPodKind]?.resources ?? {},
							resourceMissingItems,
							(a, b) => ({ ...a, ...b }),
						),
						before:
							initialCargoPodsInfos?.[cargoPodKind]?.resources ??
							Record.empty(),
					}),
				] as const;
			}),
			Record.fromEntries,
		);

		yield* Effect.log("Difference in cargo pods resources").pipe(
			Effect.annotateLogs({
				context: JSON.parse(
					JSON.stringify(differences, (_, value) =>
						value instanceof BN ? value.toString() : value,
					),
				),
			}),
		);

		const missingResources = [
			...Record.values(differences.ammo_bank),
			...Record.values(differences.fuel_tank),
			...Record.values(differences.cargo_hold),
		].filter((item) => item.diffAmountInTokens.isZero());

		const missingItems = items.filter((item) => {
			const res = missingResources.find(
				(res) =>
					res.mint.equals(item.resourceMint) &&
					res.cargoPodKind === item.cargoPodKind,
			);

			return !!res;
		});

		return yield* new LoadUnloadPartiallyFailedError({
			errors,
			signatures: [...preIxsSignatures, ...signatures],
			context: { missingResources: missingItems },
		});
	});
