import type { PublicKey } from "@solana/web3.js";
import { Console, Effect } from "effect";
import { createDepositCargoToFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const loadCargo = ({
	amount,
	fleetAddress,
	mint,
}: {
	amount: number;
	fleetAddress: PublicKey;
	mint: PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Console.log(`Loading cargo to fleet ${fleetAddress}`);

		const ixs = yield* createDepositCargoToFleetIx(fleetAddress, mint, amount);

		const gameService = yield* GameService;

		const tx =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txId = yield* gameService.utils.sendTransaction(tx);

		yield* Console.log("Fleet cargo loaded!");

		return txId;
	});
