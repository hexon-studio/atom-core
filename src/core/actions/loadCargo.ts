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
import { createItemUuid } from "~/constants/uuid";
import {
	getFleetAccount,
	getFleetAccountByNameOrAddress,
	getMineItemAccount,
	getResourceAccount,
} from "~/libs/@staratlas/sage";
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";
import {
	type CargoPodKind,
	type LoadResourceInput,
	cargoPodKinds,
} from "../../decoders";
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
	items: itemsParam,
	fleetNameOrAddress,
}: {
	fleetNameOrAddress: string | PublicKey;
	items: Array<LoadResourceInput>;
}) =>
	Effect.gen(function* () {
		const items = itemsParam.map(
			({ cargoPodKind, resourceMint, amount, mode }) => ({
				id: createItemUuid({
					cargoPodKind,
					resourceMint,
				}),
				cargoPodKind,
				resourceMint,
				amount,
				mode,
			}),
		);

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
						Effect.Do.pipe(						// ...existing code...
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
							Effect.all([
								GameService.buildAndSignTransactionWithAtlasPrime({
									ixs: stopMiningIx,
									afterIxs: drainVaultIx,
								}),
								GameService.buildAndSignTransactionWithAtlasPrime({
									ixs: dockIx,
									afterIxs: drainVaultIx,
								}),
							]),
						),
						Effect.flatMap(([stopMiningTxs, dockTxs]) =>
							Effect.all([
								...stopMiningTxs.map((tx) => GameService.sendTransaction(tx)),
								...dockTxs.map((tx) => GameService.sendTransaction(tx)),
							]),
						),
						Effect.tap(([stopMiningTxs, dockTxs]) =>
							Effect.log("Fleet stopped mining and docked to starbase.").pipe(
								Effect.annotateLogs({ stopMiningTxs, dockTxs }),
							),
						),
						// ...existing code...
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
				Effect.catchTag("FleetNotEnoughSpaceError", () => Effect.succeed(null)),
			);

			if (!enhancedItem) {
				yield* Effect.log(
					`Not enough space to load ${item.resourceMint.toString()} in ${item.cargoPodKind}, reachedCapacity (${totalResourcesAmountInCargoUnits.toString()}) >= maxCapacity (${cargoPodInfo.maxCapacityInCargoUnits.toString()})`,
				);

				continue;
			}

			if (enhancedItem.computedAmountInCargoUnits.lten(0)) {
				yield* Effect.log(
					`Skip load of ${item.resourceMint.toString()}, computed cargo units is ${enhancedItem.computedAmountInCargoUnits.toString()}`,
				);

				continue;
			}

			const enhancedItemWithSameResourceIndex = EffectArray.findFirstIndex(
				enhancedItems,
				(enhancedItem) => enhancedItem.id === item.id,
			);

			if (Option.isSome(enhancedItemWithSameResourceIndex)) {
				const enhancedItemWithSameResource =
					// biome-ignore lint/style/noNonNullAssertion: we know it's defined
					enhancedItems[enhancedItemWithSameResourceIndex.value]!;

				enhancedItems = pipe(
					enhancedItems,
					EffectArray.replace(enhancedItemWithSameResourceIndex.value, {
						...enhancedItem,
						computedAmountInCargoUnits:
							enhancedItemWithSameResource.computedAmountInCargoUnits.add(
								enhancedItem.computedAmountInCargoUnits,
							),
					}),
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

		// ...existing code...

		const txs = yield* Effect.all(
			ixs.map((ix) =>
				GameService.buildAndSignTransactionWithAtlasPrime({
					ixs: [ix],
					afterIxs: drainVaultIx,
				}),
			),
		);

		const maybeTxIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
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

		const itemsCargoPodKinds = [
			...new Set(enhancedItems.map((item) => item.cargoPodKind)),
		];

		const postCargoPodsInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: itemsCargoPodKinds,
			fleetAccount,
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
						after:
							postCargoPodsInfos?.[cargoPodKind]?.resources ?? Record.empty(),
						before: Record.union(
							initialCargoPodsInfos?.[cargoPodKind]?.resources ?? {},
							resourceMissingItems,
							(a, b) => ({ ...a, ...b }),
						),
					}),
				] as const;
			}),
			Record.fromEntries,
		);

		for (const kind of itemsCargoPodKinds) {
			yield* Effect.log(`Difference in ${kind} resources`).pipe(
				Effect.annotateLogs({
					context: JSON.parse(
						JSON.stringify(differences[kind], (_, value) =>
							value instanceof BN ? value.toString() : value,
						),
					),
				}),
			);
		}

		const missingItems = EffectArray.filterMap(
			enhancedItems,
			(enhancedItem) => {
				const podDifferences = differences[enhancedItem.cargoPodKind];
				const resourceDiff =
					podDifferences[enhancedItem.resourceMint.toString()];

				// The resource is missing if:
				// - It does not appear in the differences (resourceDiff is undefined)
				// - Or it appears but with zero difference
				if (!resourceDiff || resourceDiff.diffAmountInCargoUnits.isZero()) {
					return EffectArray.findFirst(
						items,
						(item) => item.id === enhancedItem.id,
					);
				}

				return Option.none();
			},
		);

		return yield* Effect.fail(
			new LoadUnloadPartiallyFailedError({
				errors,
				signatures: [...stopMiningSignatures, ...signatures],
				context: { missingResources: missingItems },
			}),
		);
	});
