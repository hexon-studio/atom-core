import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const undockFromStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		yield* Effect.log("Start undocking...");

		const fleetAccount =
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

		// yield* assertRentIsValid(fleetAccount);

		const ixs = yield* createPreIxs({ fleetAccount, targetState: "Idle" });

		if (ixs.length === 0) {
			return { signatures: [] };
		}

		const afterIxs = yield* createAfterIxs();

		const { options } = yield* getGameContext();

		const maxIxsPerTransaction =
			options.kind === "exec" ? options.maxIxsPerTransaction : 1;

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Fleet undocked successfully");

		return { signatures };
	});
