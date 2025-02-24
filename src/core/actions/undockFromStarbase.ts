import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const undockFromStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		yield* Effect.log("Start undocking...");

		const fleetAccount =
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

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

		const signatures = yield* GameService.sendAllTransactions(txs);

		yield* Effect.log("Fleet undocked successfully");

		return { signatures };
	});
