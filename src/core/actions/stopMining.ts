import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const stopMining = ({
	fleetNameOrAddress,
}: {
	fleetNameOrAddress: string | PublicKey;
}) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

		if (!fleetAccount.state.MineAsteroid) {
			yield* Effect.log("Fleet is not mining on asteroid");
			return { signatures: [] };
		}

		// yield* assertRentIsValid(fleetAccount);

		const resourceMint = fleetAccount.state.MineAsteroid.resource;
		yield* Effect.log(`Stop mining ${resourceMint.toString()}...`);

		const ixs = yield* createPreIxs({
			fleetAccount,
			targetState: "Idle",
		});

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

		yield* Effect.log("Mining stopped!");

		return { signatures };
	});
