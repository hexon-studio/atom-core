import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { isPublicKey } from "../../utils/public-key";
import { createUndockFromStarbaseIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAccount } from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";

export const undockFromStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		console.log("Undocking from starbase...");

		const ix = yield* createUndockFromStarbaseIx(fleetAccount);

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
