import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { isPublicKey } from "../../utils/public-key";
import { createStopMiningIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAccount } from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

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

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		if (!fleetAccount.state.MineAsteroid) {
			console.log("Fleet is not mining on asteroid");
			return [];
		}

		console.log(`Stop mining ${resourceMint}...`);

		const ixs = yield* createStopMiningIx({
			fleetAccount,
			resourceMint,
		});

		const gameService = yield* GameService;

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(drainVaultIx);

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log("Mining stopped!");

		return txIds;
	});
