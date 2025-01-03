import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import {
	Effect,
	Array as EffectArray,
	Match,
	Option,
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
import { LoadUnloadPartiallyFailedError } from "../fleet/errors";
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

		const { ixs: preIxs, txIds: stopMiningTxsIds } = yield* Match.value(
			fleetAccount.state,
		).pipe(
			Match.whenOr(
				{ Idle: Match.defined },
				{ MoveWarp: Match.defined },
				{ MoveSubwarp: Match.defined },
				() =>
					createDockToStarbaseIx(fleetAccount).pipe(
						Effect.map((ixs) => ({ txIds: [] as string[], ixs })),
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
						// Sending the transactions before doing the next step
						Effect.flatMap(({ stopMiningIx, dockIx }) =>
							GameService.buildAndSignTransactionWithAtlasPrime([
								...stopMiningIx,
								...dockIx,
							]),
						),
						Effect.flatMap((txs) =>
							Effect.all(txs.map((tx) => GameService.sendTransaction(tx))),
						),
						Effect.tap((txs) =>
							Effect.log("Fleet stopped mining and docked to starbase.").pipe(
								Effect.annotateLogs({ txs }),
							),
						),
						Effect.flatMap((txIds) =>
							Effect.sleep("10 seconds").pipe(
								Effect.map(() => ({ txIds, ixs: [] })),
							),
						),
					),
			),
			Match.orElse(() => Effect.succeed({ txIds: [] as string[], ixs: [] })),
		);

		ixs.push(...preIxs);

		const itemsCargoPodsKinds = [
			...new Set(items.map((item) => item.cargoPodKind)),
		];

		const {
			ammo_bank: ammoBankPodInfo,
			cargo_hold: cargoHoldPodInfo,
			fuel_tank: fuelTankPodInfo,
		} = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodsKinds,
			fleetAccount,
		});

		const freshFleetAccount = yield* getFleetAccount(fleetAccount.key);

		const unloadCargoIxs = yield* Effect.all(
			EffectArray.filterMap(items, (item) => {
				const cargoPodInfo = Match.value(item.cargoPodKind).pipe(
					Match.when("ammo_bank", () => ammoBankPodInfo),
					Match.when("fuel_tank", () => fuelTankPodInfo),
					Match.when("cargo_hold", () => cargoHoldPodInfo),
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

		if (!unloadCargoIxs.length) {
			yield* Effect.log("Nothing to unload. Skipping");

			return [];
		}

		ixs.push(...unloadCargoIxs);

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(...drainVaultIx);

		const txs = yield* GameService.buildAndSignTransactionWithAtlasPrime(ixs);

		const maybeTxIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx).pipe(Effect.either)),
			{ concurrency: 5 },
		);

		const [errors, signatures] = EffectArray.partitionMap(maybeTxIds, identity);

		if (EffectArray.isNonEmptyArray(errors)) {
			const cargoPodKinds = [
				...new Set(items.map((item) => item.cargoPodKind)),
			];

			const cargoPodsInfos = yield* getFleetCargoPodInfosForItems({
				cargoPodKinds,
				fleetAccount,
			}).pipe(Effect.orElseSucceed(constNull));

			const ammoDifference =
				cargoPodsInfos?.ammo_bank && ammoBankPodInfo
					? getCargoPodsResourcesDifference({
							after: cargoPodsInfos.ammo_bank,
							before: ammoBankPodInfo,
						})
					: [];
			const fuelDifference =
				cargoPodsInfos?.fuel_tank && fuelTankPodInfo
					? getCargoPodsResourcesDifference({
							after: cargoPodsInfos.fuel_tank,
							before: fuelTankPodInfo,
						})
					: [];
			const cargoDifference =
				cargoPodsInfos?.cargo_hold && cargoHoldPodInfo
					? getCargoPodsResourcesDifference({
							after: cargoPodsInfos.cargo_hold,
							before: cargoHoldPodInfo,
						})
					: [];

			const missingResources = [
				...ammoDifference,
				...fuelDifference,
				...cargoDifference,
			].filter((item) => item.amountInTokens.isZero());

			const missingItems = items.filter((item) => {
				const res = missingResources.find(
					(res) =>
						res.mint.equals(item.resourceMint) &&
						res.cargoPodKind === item.cargoPodKind,
				);

				return !!res;
			});

			yield* new LoadUnloadPartiallyFailedError({
				errors,
				signatures,
				context: { missingResources: missingItems },
			});
		}

		return [...stopMiningTxsIds, ...signatures];
	});
