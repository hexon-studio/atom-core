import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
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
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";
import type { CargoPodKind, LoadResourceInput } from "../../decoders";
import {
	LoadUnloadFailedError,
	LoadUnloadPartiallyFailedError,
} from "../fleet/errors";
import {
	createDepositCargoToFleetIx,
	createDockToStarbaseIx,
	createStopMiningIx,
} from "../fleet/instructions";
import {
	type CargoPodsDifference,
	getCargoPodsResourcesDifference,
} from "../fleet/utils/getCargoPodsResourcesDifference";
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
								GameService.buildAndSignTransactionWithAtlasPrime({
									ixs: [...stopMiningIx, ...dockIx],
									afterIxs: drainVaultIx,
								}),
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

		const initialCargoPodsInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodsKinds,
			fleetAccount,
		});

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			startbaseCoords: fleetCoords,
		});

		let enhancedItems: EnhancedResourceItem[] = [];

		for (const item of items) {
			const cargoPodInfo = initialCargoPodsInfos[item.cargoPodKind];

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

			const enhancedItemWithSameResource = EffectArray.findFirst(
				enhancedItems,
				(enhancedItem) => enhancedItem.resourceMint.equals(item.resourceMint),
			);

			if (
				Option.isSome(enhancedItemWithSameResource) &&
				enhancedItemWithSameResource.value.cargoPodKind ===
					enhancedItem.cargoPodKind
			) {
				enhancedItems = EffectArray.map(enhancedItems, (enhancedItem) =>
					enhancedItem.resourceMint.equals(
						enhancedItemWithSameResource.value.resourceMint,
					)
						? enhancedItem
						: {
								...enhancedItem,
								computedAmountInCargoUnits:
									enhancedItemWithSameResource.value.computedAmountInCargoUnits.add(
										enhancedItem.computedAmountInCargoUnits,
									),
							},
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
					cargoPodPublicKey: item.cargoPodPublicKey,
					item: {
						amount: finalAmountToDeposit,
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

		const drainVaultIx = yield* createDrainVaultIx();

		const txs = yield* GameService.buildAndSignTransactionWithAtlasPrime({
			ixs,
			afterIxs: drainVaultIx,
		});

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
			return [...stopMiningSignatures, ...signatures];
		}

		// NOTE: Some transactions failed
		yield* Effect.sleep("10 seconds");

		const cargoPodKinds = [
			...new Set(enhancedItems.map((item) => item.cargoPodKind)),
		];

		const loadingResources = enhancedItems.map((item) =>
			item.resourceMint.toString(),
		);

		const postCargoPodsInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds,
			fleetAccount,
		}).pipe(Effect.orElseSucceed(constNull));

		const differences: Record<CargoPodKind, CargoPodsDifference> = pipe(
			cargoPodKinds,
			EffectArray.map(
				(cargoPodKind) =>
					[
						cargoPodKind,
						getCargoPodsResourcesDifference({
							cargoPodKind,
							after:
								postCargoPodsInfos?.[cargoPodKind]?.resources ?? Record.empty(),
							before:
								initialCargoPodsInfos?.[cargoPodKind]?.resources ??
								Record.empty(),
						}),
					] as const,
			),
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
		].filter(
			(res) =>
				res.diffAmountInCargoUnits.isZero() &&
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
				signatures: [...stopMiningSignatures, ...signatures],
				context: { missingResources: missingItems },
			}),
		);
	});
