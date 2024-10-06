import { Effect } from "effect";
import { createStopMiningIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";
import type { PublicKey } from "@solana/web3.js";
import { isPublicKey } from "../../utils/public-key";

// export class FleetNotMiningError extends Data.TaggedError(
// 	"FleetNotMiningError",
// ) {}

// export const stopMining = (fleetName: string) =>
// 	Effect.gen(function* () {
// 		const fleetPubkey = yield* getFleetAddressByName(fleetName);

// 		const fleetAccount = yield* getFleetAccount(fleetPubkey);

// 		if (!fleetAccount.state.MineAsteroid) {
// 			return yield* Effect.fail(new FleetNotMiningError());
// 		}

// 		console.log("Stop mining...");

// 		const ix = yield* createStopMiningIx(fleetPubkey);

// 		const gameService = yield* GameService;

// 		const tx = yield* gameService.utils.buildAndSignTransaction(ix);

// 		const txId = yield* gameService.utils.sendTransaction(tx);

// 		return txId;
// 	});

export const stopMining = ({
	fleetNameOrAddress,
	resourceMint,
}: {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
}) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		console.log(`Stop mining ${resourceMint}...`);

		const ixs = yield* createStopMiningIx({
			fleetAddress,
			resourceMint,
		});

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log("Mining stopped!");

		return txIds;
	});
