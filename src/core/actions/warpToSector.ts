import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
import { Effect, Match, pipe } from "effect";
import {
	getFleetAccount,
	getFleetAccountByNameOrAddress,
	getMineItemAccount,
	getResourceAccount,
} from "~/libs/@staratlas/sage";
import { FleetWarpCooldownError } from "../fleet/errors";
import {
	createStopMiningIx,
	createUndockFromStarbaseIx,
	createWarpToCoordinateIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const warpToSector = ({
	fleetNameOrAddress,
	targetSector: [targetSectorX, targetSectorY],
}: {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
}) =>
	Effect.gen(function* () {
		yield* Effect.log("Start warp...");

		let fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const warpCooldownExpiresAt =
			fleetAccount.data.warpCooldownExpiresAt.toNumber();

		const timestampInSeconds = Math.floor(Date.now() / 1000);

		if (warpCooldownExpiresAt > timestampInSeconds) {
			yield* Effect.log("Warp is on cooldown");

			return yield* Effect.fail(
				new FleetWarpCooldownError({
					warpCooldownExpiresAt: new Date(
						warpCooldownExpiresAt * 1000,
					).toISOString(),
				}),
			);
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* Match.value(fleetAccount.state).pipe(
			Match.when(
				{ MineAsteroid: Match.defined },
				({ MineAsteroid: { resource } }) =>
					pipe(
						getResourceAccount(resource),
						Effect.flatMap((resource) =>
							getMineItemAccount(resource.data.mineItem),
						),
						Effect.flatMap((mineItem) => {
							return createStopMiningIx({
								resourceMint: mineItem.data.mint,
								fleetAccount,
							});
						}),
					),
			),
			Match.when({ StarbaseLoadingBay: Match.defined }, () =>
				createUndockFromStarbaseIx(fleetAccount).pipe(Effect.map((ix) => [ix])),
			),
			Match.orElse(() => Effect.succeed([] as InstructionReturn[])),
		);

		if (preIxs.length) {
			// NOTE: get a fresh fleet account
			fleetAccount = yield* getFleetAccount(fleetAccount.key);
		}

		ixs.push(...preIxs);

		const warpIxs = yield* createWarpToCoordinateIx({
			fleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		if (!warpIxs.length) {
			yield* Effect.log("Fleet already in target sector. Skipping");

			return [];
		}

		ixs.push(...warpIxs);

		const drainVaultIx = yield* createDrainVaultIx();

		const txs = yield* GameService.buildAndSignTransactionWithAtlasPrime({
			ixs,
			afterIxs: drainVaultIx,
		});

		const txId = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log(`Warping to - X: ${targetSectorX} | Y: ${targetSectorY}`);

		return txId;
	});
