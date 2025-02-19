import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

/**
 * Undocks a fleet from a starbase
 * @param fleetNameOrAddress - The fleet identifier to undock
 */
export const undockFromStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		yield* Effect.log("Start undocking...");

		// Get fleet information
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const ixs = yield* createPreIxs({ fleetAccount, targetState: "Idle" });

		if (ixs.length === 0) {
			return { signatures: [] };
		}

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

		yield* Effect.log("Fleet undocked successfully");

		return { signatures };
	});
