import { Data, Effect } from "effect";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createStopMiningIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

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
