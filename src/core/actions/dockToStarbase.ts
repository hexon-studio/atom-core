import { Effect } from "effect";
import { getFleetAddressByName } from "../utils/pdas";
import { createDockToStarbaseIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";

export const dockToStarbase = (fleetName: string) =>
	Effect.gen(function* () {
		const fleetPubkey = yield* getFleetAddressByName(fleetName);

		console.log("Docking to starbase...");

		const ix = yield* createDockToStarbaseIx(fleetPubkey);

		const gameService = yield* GameService;

		const tx = yield* gameService.utils.buildAndSignTransaction([ix]);
		const txId = yield* gameService.utils.sendTransaction(tx);

		console.log("Fleet docked!");

		return txId;
	});
