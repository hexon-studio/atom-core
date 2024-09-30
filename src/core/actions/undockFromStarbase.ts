import { Effect } from "effect";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createUndockFromStarbaseIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const undockFromStarbase = (fleetName: string) =>
	Effect.gen(function* () {
		const fleetPubkey = yield* getFleetAddressByName(fleetName);
		const fleetAccount = yield* getFleetAccount(fleetPubkey);

		if (fleetAccount.state.Idle) {
			console.log("Already idle.");
			return;
		}

		console.log("Undocking from starbase...");

		const ix = yield* createUndockFromStarbaseIx(fleetPubkey);

		const gameService = yield* GameService;

		const tx = yield* gameService.utils.buildAndSignTransaction([ix]);
		const txId = yield* gameService.utils.sendTransaction(tx);

		console.log("Fleet undocked!");

		return txId;
	});
