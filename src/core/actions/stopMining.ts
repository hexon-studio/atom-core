import { Data, Effect } from "effect";
import { createStopMiningIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAccount } from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";

export class FleetNotMiningError extends Data.TaggedError(
	"FleetNotMiningError",
) {}

export const stopMining = (fleetName: string) =>
	Effect.gen(function* () {
		const fleetPubkey = yield* getFleetAddressByName(fleetName);

		const fleetAccount = yield* getFleetAccount(fleetPubkey);

		if (!fleetAccount.state.MineAsteroid) {
			return yield* Effect.fail(new FleetNotMiningError());
		}

		console.log("Stop mining...");

		const ix = yield* createStopMiningIx(fleetPubkey);

		const gameService = yield* GameService;

		const tx = yield* gameService.utils.buildAndSignTransaction(ix);

		const txId = yield* gameService.utils.sendTransaction(tx);

		return txId;
	});
