import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { SAGE_CARGO_STAT_VALUE_INDEX } from "@staratlas/sage";
import BN from "bn.js";
import {
	Data,
	Effect,
	Array as EffectArray,
	Match,
	Option,
	Record,
	pipe,
} from "effect";
import { resourceMintToName } from "../../constants/resources";
import type { LoadResourceInput } from "../../decoders";
import { getFleetCargoPodInfoByType } from "../cargo-utils";
import {
	createDepositCargoToFleetIx,
	createDockToStarbaseIx,
	createStopMiningIx,
} from "../fleet/instructions";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import { GameService } from "../services/GameService";
import {
	getFleetAccount,
	getFleetAccountByNameOrAddress,
	getMineItemAccount,
	getResourceAccount,
} from "../utils/accounts";
import {
	type EnhancedResourceItem,
	enrichLoadResourceInput,
} from "../utils/enrichLoadResourceItem";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export class BuildOptinalTxError extends Data.TaggedError(
	"BuildOptinalTxError",
)<{ error: unknown }> {
	override get message() {
		return String(this.error);
	}
}

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

		const [ammoBankPodInfo, fuelTankPodInfo, cargoHoldPodInfo] =
			yield* Effect.all(
				[
					getFleetCargoPodInfoByType({
						fleetAccount,
						type: "ammo_bank",
					}),
					getFleetCargoPodInfoByType({
						fleetAccount,
						type: "fuel_tank",
					}),
					getFleetCargoPodInfoByType({
						fleetAccount,
						type: "cargo_hold",
					}),
				],
				{ concurrency: "unbounded" },
			);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			startbaseCoords: fleetCoords,
		});

		const enhancedItems = yield* pipe(
			items,
			EffectArray.map((item) =>
				enrichLoadResourceInput({
					item,
					pods: {
						ammo_bank: ammoBankPodInfo,
						fuel_tank: fuelTankPodInfo,
						cargo_hold: cargoHoldPodInfo,
					},
					starbasePlayerCargoPodsPubkey:
						starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
				}),
			),
			Effect.all,
		);

		const groupedItems = EffectArray.groupBy(
			enhancedItems,
			(item) => item.cargoPodKind,
		);

		const ammoAndFuelItems = [
			...(groupedItems?.ammo_bank ?? []),
			...(groupedItems?.fuel_tank ?? []),
		];

		const enhancedCargoItems = groupedItems?.cargo_hold ?? [];

		const cargoItemsToLoad: Array<EnhancedResourceItem> = [];

		// Check if the cargo_hold pod has enough space to load all the items
		for (const enhancedItem of enhancedCargoItems) {
			const reachedCapacity = EffectArray.reduce(
				cargoItemsToLoad,
				new BN(cargoHoldPodInfo.totalResourcesAmountInCargoUnits),
				(acc, item) => acc.add(item.computedAmountInCargoUnits),
			);

			const nextReachedCapacity = reachedCapacity
				.clone()
				.add(enhancedItem.computedAmountInCargoUnits);

			if (nextReachedCapacity.gt(cargoHoldPodInfo.maxCapacityInCargoUnits)) {
				yield* Effect.log(
					`Not enough space to load ${enhancedItem.resourceMint.toString()}, reachedCapacity (${nextReachedCapacity.toString()}) > maxCapacity (${cargoHoldPodInfo.maxCapacityInCargoUnits.toString()})`,
				);

				continue;
			}

			cargoItemsToLoad.push(enhancedItem);
		}

		const loadingItems = cargoItemsToLoad.map((item) =>
			pipe(
				Record.get(resourceMintToName, item.resourceMint.toString()),
				Option.getOrElse(() => item.resourceMint.toString()),
			),
		);

		yield* Effect.log(`Loading: ${loadingItems.join()} items`).pipe(
			Effect.annotateLogs({ cargoItemsToLoad }),
		);

		const allEnhancedItems: Array<EnhancedResourceItem> = [
			...ammoAndFuelItems,
			...cargoItemsToLoad,
		];

		const [loadEnhancedItems, skipLoadEnhancedItems] = pipe(
			allEnhancedItems,
			EffectArray.partition((item) => {
				const resourceSpaceMultiplier =
					item.cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(1);

				// NOTE: Transform amount in tokens
				const finalAmountToDeposit = item.computedAmountInCargoUnits.div(
					resourceSpaceMultiplier,
				);

				return finalAmountToDeposit.lten(0);
			}),
		);

		if (skipLoadEnhancedItems.length) {
			// NOTE: TLDR just logging the items that are not going to be loaded
			yield* Effect.all(
				EffectArray.map(skipLoadEnhancedItems, (item) => {
					const resourceSpaceMultiplier =
						item.cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ??
						new BN(1);

					// NOTE: Transform amount in tokens
					const finalAmountToDeposit = item.computedAmountInCargoUnits.div(
						resourceSpaceMultiplier,
					);

					return Effect.log(
						`Skip deposit of ${item.resourceMint.toString()}, computed amount is: ${finalAmountToDeposit.toString()}`,
					);
				}),
			);
		}

		const freshFleetAccount = yield* getFleetAccount(fleetAccount.key);

		const loadCargoIxs = yield* Effect.all(
			EffectArray.map(loadEnhancedItems, (item) => {
				const resourceSpaceMultiplier =
					item.cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(1);

				// NOTE: Transform amount in tokens
				const finalAmountToDeposit = item.computedAmountInCargoUnits.div(
					resourceSpaceMultiplier,
				);

				return createDepositCargoToFleetIx({
					fleetAccount: freshFleetAccount,
					starbaseInfo,
					item: {
						amount: finalAmountToDeposit,
						cargoPodInfo: Match.value(item.cargoPodKind).pipe(
							Match.when("ammo_bank", () => ammoBankPodInfo),
							Match.when("fuel_tank", () => fuelTankPodInfo),
							Match.when("cargo_hold", () => cargoHoldPodInfo),
							Match.exhaustive,
						),
						cargoPodKind: item.cargoPodKind,
						resourceMint: item.resourceMint,
						starbaseResourceTokenAccount: item.starbaseResourceTokenAccount,
					},
				});
			}),
		).pipe(Effect.map(EffectArray.flatten));

		if (!loadCargoIxs.length) {
			yield* Effect.log("Nothing to load. Skipping");

			return [];
		}

		ixs.push(...loadCargoIxs);

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(...drainVaultIx);

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		return txIds;
	});
