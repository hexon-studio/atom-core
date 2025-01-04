import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
import {
	Effect,
	Array as EffectArray,
	Match,
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
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";
import type { LoadResourceInput } from "../../decoders";
import {
	LoadUnloadFailedError,
	LoadUnloadPartiallyFailedError,
} from "../fleet/errors";
import {
	createDepositCargoToFleetIx,
	createDockToStarbaseIx,
	createStopMiningIx,
} from "../fleet/instructions";
import { getCargoPodsResourcesDifference } from "../fleet/utils/getCargoPodsResourcesDifference";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import { getFleetCargoPodInfosForItems } from "../fleet/utils/getFleetCargoPodInfosForItems";
import { GameService } from "../services/GameService";
import {
	type EnhancedResourceItem,
	enhanceLoadResourceItem,
} from "../utils/enhanceLoadResourceItem";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const loadCargo = ({
	items,
	fleetNameOrAddress,
}: {
	fleetNameOrAddress: string | PublicKey;
	items: Array<LoadResourceInput>;
}) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		yield* Effect.log(`Loading cargo to fleet ${fleetAccount.key.toString()}`);

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* Match.value(fleetAccount.state).pipe(
			Match.whenOr(
				{ Idle: Match.defined },
				{ MoveWarp: Match.defined },
				{ MoveSubwarp: Match.defined },
				() => createDockToStarbaseIx(fleetAccount),
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
						Effect.map(({ stopMiningIx, dockIx }) => [
							...stopMiningIx,
							...dockIx,
						]),
					),
			),
			Match.orElse(() => Effect.succeed([])),
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

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			startbaseCoords: fleetCoords,
		});

		const enhancedItems: EnhancedResourceItem[] = [];

		for (const item of items) {
			const cargoPodInfo = Match.value(item.cargoPodKind).pipe(
				Match.when("ammo_bank", () => ammoBankPodInfo),
				Match.when("fuel_tank", () => fuelTankPodInfo),
				Match.when("cargo_hold", () => cargoHoldPodInfo),
				Match.exhaustive,
			);

			if (!cargoPodInfo) {
				continue;
			}

			const enhanceItemsForPod = EffectArray.filter(
				enhancedItems,
				({ cargoPodKind }) => cargoPodKind === item.cargoPodKind,
			);

			const totalResourcesAmountInCargoUnits = EffectArray.reduce(
				enhanceItemsForPod,
				new BN(cargoPodInfo.totalResourcesAmountInCargoUnits),
				(acc, item) => acc.add(item.computedAmountInCargoUnits),
			);

			const enhancedItem = yield* enhanceLoadResourceItem({
				item,
				cargoPodInfo,
				totalResourcesAmountInCargoUnits,
				starbasePlayerCargoPodsPubkey:
					starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
			}).pipe(
				Effect.catchTags({
					FleetNotEnoughSpaceError: () => Effect.succeed(null),
					ResourceNotEnoughError: () => Effect.succeed(null),
				}),
			);

			if (!enhancedItem) {
				yield* Effect.log(
					`Not enough space to load ${item.resourceMint.toString()}, reachedCapacity (${totalResourcesAmountInCargoUnits.toString()}) >= maxCapacity (${cargoPodInfo.maxCapacityInCargoUnits.toString()})`,
				);

				continue;
			}

			if (enhancedItem.computedAmountInCargoUnits.lten(0)) {
				yield* Effect.log(
					`Skip load of ${item.resourceMint.toString()}, computed cargo units is ${enhancedItem.computedAmountInCargoUnits.toString()}`,
				);

				continue;
			}

			enhancedItems.push(enhancedItem);
		}

		const freshFleetAccount = yield* getFleetAccount(fleetAccount.key);

		const loadCargoIxs = yield* Effect.all(
			EffectArray.map(enhancedItems, (item) => {
				const resourceSpaceMultiplier = getCargoTypeResourceMultiplier(
					item.cargoTypeAccount,
				);

				// NOTE: Transform amount in tokens
				const finalAmountToDeposit = item.computedAmountInCargoUnits.div(
					resourceSpaceMultiplier,
				);

				return createDepositCargoToFleetIx({
					fleetAccount: freshFleetAccount,
					starbaseInfo,
					item: {
						amount: finalAmountToDeposit,
						cargoPodInfo: item.cargoPodInfo,
						cargoPodKind: item.cargoPodKind,
						resourceMint: item.resourceMint,
						starbaseResourceTokenAccount: item.starbaseResourceTokenAccount,
					},
				});
			}),
		).pipe(Effect.map(EffectArray.flatten));

		if (EffectArray.isEmptyArray(loadCargoIxs)) {
			yield* Effect.log("Nothing to load. Skipping");

			return [];
		}

		ixs.push(...loadCargoIxs);

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(...drainVaultIx);

		const txs = yield* GameService.buildAndSignTransactionWithAtlasPrime(ixs);

		const maybeTxIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx).pipe(Effect.either)),
			{ concurrency: 5 },
		);

		const [errors, signatures] = EffectArray.partitionMap(maybeTxIds, identity);

		if (EffectArray.isEmptyArray(signatures)) {
			// NOTE: All transactions failed
			return yield* Effect.fail(new LoadUnloadFailedError({ errors }));
		}

		if (EffectArray.isEmptyArray(errors)) {
			// NOTE: All transactions succeeded
			return signatures;
		}

		// NOTE: Some transactions failed

		const cargoPodKinds = [
			...new Set(enhancedItems.map((item) => item.cargoPodKind)),
		];

		const loadingResources = enhancedItems.map((item) =>
			item.resourceMint.toString(),
		);

		const cargoPodsInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds,
			fleetAccount,
		}).pipe(Effect.orElseSucceed(constNull));

		const ammoDifference = getCargoPodsResourcesDifference({
			cargoPodKind: "ammo_bank",
			after: cargoPodsInfos?.ammo_bank?.resources ?? Record.empty(),
			before: ammoBankPodInfo?.resources ?? Record.empty(),
		});

		const fuelDifference = getCargoPodsResourcesDifference({
			cargoPodKind: "fuel_tank",
			after: cargoPodsInfos?.fuel_tank?.resources ?? Record.empty(),
			before: fuelTankPodInfo?.resources ?? Record.empty(),
		});

		const cargoDifference = getCargoPodsResourcesDifference({
			cargoPodKind: "cargo_hold",
			after: cargoPodsInfos?.cargo_hold?.resources ?? Record.empty(),
			before: cargoHoldPodInfo?.resources ?? Record.empty(),
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
		].filter(
			(res) =>
				res.diffAmountInTokens.isZero() &&
				loadingResources.includes(res.mint.toString()),
		);

		const missingItems = items.filter((item) => {
			const res = missingResources.find(
				(res) =>
					res.mint.equals(item.resourceMint) &&
					res.cargoPodKind === item.cargoPodKind,
			);

			return !!res;
		});

		return yield* Effect.fail(
			new LoadUnloadPartiallyFailedError({
				errors,
				signatures,
				context: { missingResources: missingItems },
			}),
		);
	});
