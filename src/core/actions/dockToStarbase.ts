import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { isPublicKey } from "../../utils/public-key";
import { createDockToStarbaseIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAccount } from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";

export const dockToStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		console.log(`Docking fleet ${fleetAddress} to starbase...`);

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		if (!fleetAccount.state.Idle) {
			console.log("Fleet can't be docked to starbase");
			return [];
		}

		const ixs = yield* createDockToStarbaseIx(fleetAccount);

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log("Fleet docked!");

		return txIds;
	});
