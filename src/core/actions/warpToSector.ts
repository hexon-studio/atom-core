import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { FleetWarpCooldownError } from "../fleet/errors";
import { createWarpToCoordinateIx } from "../fleet/instructions";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
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

		const fleetAccount =
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

		const preIxs = yield* createPreIxs({ fleetAccount, target: "Idle" });

		ixs.push(...preIxs);

		const warpIxs = yield* createWarpToCoordinateIx({
			fleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		if (!warpIxs.length) {
			yield* Effect.log("Fleet already in target sector. Skipping");

			return { signatures: [] };
		}

		ixs.push(...warpIxs);

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log(`Warping to - X: ${targetSectorX} | Y: ${targetSectorY}`);

		return { signatures };
	});
