import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { isPublicKey } from "../../utils/public-key";
import { createUndockFromStarbaseIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";

export const undockFromStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		// const fleetAccount = yield* getFleetAccount(fleetPubkey);

		// if (fleetAccount.state.Idle) {
		// 	console.log("Already idle.");
		// 	return;
		// }

		console.log("Undocking from starbase...");

		const ix = yield* createUndockFromStarbaseIx(fleetAddress);

		const gameService = yield* GameService;

		const txs = yield* gameService.utils.buildAndSignTransactionWithAtlasPrime([
			ix,
		]);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log("Fleet undocked!");

		return txIds;
	});
