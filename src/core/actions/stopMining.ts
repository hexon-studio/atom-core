import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createStopMiningIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const stopMining = ({
	fleetNameOrAddress,
	resourceMint,
}: {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
}) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		if (!fleetAccount.state.MineAsteroid) {
			yield* Effect.log("Fleet is not mining on asteroid");

			return [];
		}

		yield* Effect.log(`Stop mining ${resourceMint}...`);

		const ixs = yield* createStopMiningIx({
			fleetAccount,
			resourceMint,
		});

		const gameService = yield* GameService;

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(...drainVaultIx);

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		yield* Effect.log("Mining stopped!");

		return txIds;
	});
