import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect, Array as EffectArray, Match, pipe } from "effect";
import type { UnloadResourceInput } from "../../decoders";
import { isPublicKey } from "../../utils/public-key";
import {
	createDockToStarbaseIx,
	createStopMiningIx,
	createWithdrawCargoFromFleetIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import {
	getFleetAccount,
	getMineItemAccount,
	getResourceAccount,
} from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const unloadCargo = ({
	fleetNameOrAddress,
	items,
}: {
	fleetNameOrAddress: string | PublicKey;
	items: Array<UnloadResourceInput>;
}) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		yield* Effect.log(
			`Unloading cargo from fleet ${fleetNameOrAddress.toString()}`,
		);

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		const ixs: InstructionReturn[] = [];

		const gameService = yield* GameService;

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
							gameService.utils.buildAndSignTransactionWithAtlasPrime([
								...stopMiningIx,
								...dockIx,
							]),
						),
						Effect.flatMap((txs) =>
							Effect.all(
								txs.map((tx) => gameService.utils.sendTransaction(tx)),
							),
						),
						Effect.tap((txs) =>
							Effect.log("Fleet stopped mining and docked to starbase.").pipe(
								Effect.annotateLogs({ txs }),
							),
						),
						Effect.flatMap((txIds) =>
							Effect.sleep(5000).pipe(Effect.map(() => ({ txIds, ixs: [] }))),
						),
					),
			),
			Match.orElse(() => Effect.succeed({ txIds: [] as string[], ixs: [] })),
		);

		ixs.push(...preIxs);

		const freshFleetAccount = yield* getFleetAccount(fleetAddress);

		const unloadCargoIxs = yield* Effect.all(
			EffectArray.map(items, (item) =>
				createWithdrawCargoFromFleetIx({
					fleetAccount: freshFleetAccount,
					item,
				}),
			),
		).pipe(Effect.map(EffectArray.flatten));

		if (!unloadCargoIxs.length) {
			yield* Effect.log("Nothing to unload. Skipping");

			return [];
		}

		ixs.push(...unloadCargoIxs);

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(...drainVaultIx);

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		return [...stopMiningTxsIds, ...txIds];
	});
