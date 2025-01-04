import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { BN } from "bn.js";
import {
	Effect,
	Array as EffectArray,
	Match,
	Option,
	Record,
	identity,
	pipe,
} from "effect";
import { constNull } from "effect/Function";
import {
	getFleetAccount,
	getFleetAccountByNameOrAddress,
	getMineItemAccount,
	getResourceAccount,
} from "~/libs/@staratlas/sage";
import type { UnloadResourceInput } from "../../decoders";
import {
	LoadUnloadFailedError,
	LoadUnloadPartiallyFailedError,
} from "../fleet/errors";
import {
	createDockToStarbaseIx,
	createStopMiningIx,
	createWithdrawCargoFromFleetIx,
} from "../fleet/instructions";
import { getCargoPodsResourcesDifference } from "../fleet/utils/getCargoPodsResourcesDifference";
import { getFleetCargoPodInfosForItems } from "../fleet/utils/getFleetCargoPodInfosForItems";
import { GameService } from "../services/GameService";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

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

		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const ixs: InstructionReturn[] = [];

		const { ixs: preIxs, signatures: stopMiningSignatures } =
			yield* Match.value(fleetAccount.state).pipe(
				Match.whenOr(
					{ Idle: Match.defined },
					{ MoveWarp: Match.defined },
					{ MoveSubwarp: Match.defined },
					() =>
						createDockToStarbaseIx(fleetAccount).pipe(
							Effect.map((ixs) => ({ signatures: [] as string[], ixs })),
						),
				),
				Match.when(
					{ MineAsteroid: Match.defined },
					({ MineAsteroid: { resource } }) =>
						Effect.Do.pipe(
							Effect.bind("stopMiningIx", () =>
								pipe(
									getResourceAccount(resource),
									Effect.flatMap((resource) =>
										getMineItemAccount(resource.data.mineItem),
									),
									Effect.flatMap((mineItem) =>
										createStopMiningIx({
											resourceMint: mineItem.data.mint,
											fleetAccount,
										}),
									),
								),
							),
							Effect.bind("dockIx", () => createDockToStarbaseIx(fleetAccount)),
							Effect.bind("drainVaultIx", () => createDrainVaultIx()),
							// Sending the transactions before doing the next step
							Effect.flatMap(({ stopMiningIx, dockIx, drainVaultIx }) =>
								GameService.buildAndSignTransactionWithAtlasPrime(
									[...stopMiningIx, ...dockIx],
									drainVaultIx,
								),
							),
							Effect.flatMap((txs) =>
								Effect.all(txs.map((tx) => GameService.sendTransaction(tx))),
							),
							Effect.tap((txs) =>
								Effect.log("Fleet stopped mining and docked to starbase.").pipe(
									Effect.annotateLogs({ txs }),
								),
							),
							Effect.flatMap((signatures) =>
								Effect.sleep("10 seconds").pipe(
									Effect.map(() => ({ signatures, ixs: [] })),
								),
							),
						),
				),
				Match.orElse(() =>
					Effect.succeed({ signatures: [] as string[], ixs: [] }),
				),
			);

		ixs.push(...preIxs);

		const itemsCargoPodsKinds = [
			...new Set(items.map((item) => item.cargoPodKind)),
		];

		const {
			ammo_bank: initialAmmoBankPodInfo,
			cargo_hold: initialCargoHoldPodInfo,
			fuel_tank: initialFuelTankPodInfo,
		} = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodsKinds,
			fleetAccount,
		});

		const freshFleetAccount = yield* getFleetAccount(fleetAccount.key);

		const unloadCargoIxs = yield* Effect.all(
			EffectArray.filterMap(items, (item) => {
				const cargoPodInfo = Match.value(item.cargoPodKind).pipe(
					Match.when("ammo_bank", () => initialAmmoBankPodInfo),
					Match.when("fuel_tank", () => initialFuelTankPodInfo),
					Match.when("cargo_hold", () => initialCargoHoldPodInfo),
					Match.exhaustive,
				);

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

			return [];
		}

		ixs.push(...unloadCargoIxs);

		const drainVaultIx = yield* createDrainVaultIx();

		const txs = yield* GameService.buildAndSignTransactionWithAtlasPrime(
			ixs,
			drainVaultIx,
		);

		const maybeSignatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx).pipe(Effect.either)),
			{ concurrency: 5 },
		);

		const [errors, signatures] = EffectArray.partitionMap(
			maybeSignatures,
			identity,
		);

		// NOTE: All transactions failed
		if (EffectArray.isEmptyArray(signatures)) {
			return yield* Effect.fail(new LoadUnloadFailedError({ errors }));
		}

		// NOTE: All transactions succeeded
		if (EffectArray.isEmptyArray(errors)) {
			return signatures;
		}

		// NOTE: Some transactions failed
		yield* Effect.sleep("10 seconds");

		const postCargoPodInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodsKinds,
			fleetAccount,
		}).pipe(Effect.orElseSucceed(constNull));

		const ammoDifference = getCargoPodsResourcesDifference({
			cargoPodKind: "ammo_bank",
			after: postCargoPodInfos?.ammo_bank?.resources ?? Record.empty(),
			before: initialAmmoBankPodInfo?.resources ?? Record.empty(),
		});

		const fuelDifference = getCargoPodsResourcesDifference({
			cargoPodKind: "fuel_tank",
			after: postCargoPodInfos?.fuel_tank?.resources ?? Record.empty(),
			before: initialFuelTankPodInfo?.resources ?? Record.empty(),
		});

		const cargoDifference = getCargoPodsResourcesDifference({
			cargoPodKind: "cargo_hold",
			after: postCargoPodInfos?.cargo_hold?.resources ?? Record.empty(),
			before: initialCargoHoldPodInfo?.resources ?? Record.empty(),
		});

		yield* Effect.log("Difference in cargo pods resources").pipe(
			Effect.annotateLogs({
				context: JSON.parse(
					JSON.stringify(
						{ ammoDifference, fuelDifference, cargoDifference },
						(_, value) => (value instanceof BN ? value.toString() : value),
					),
				),
			}),
		);

		const missingResources = [
			...ammoDifference,
			...fuelDifference,
			...cargoDifference,
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
			signatures,
			context: { missingResources: missingItems },
		});
	});
