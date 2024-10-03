import type { PublicKey } from "@solana/web3.js";
import { Console, Data, Effect } from "effect";
import type { CargoPodKind } from "../../types";
import { createDepositCargoToFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export class BuildOptinalTxError extends Data.TaggedError(
	"BuildOptinalTxError",
)<{ error: unknown }> {
	override get message() {
		return String(this.error);
	}
}

export const loadCargo = ({
	amount,
	fleetAddress,
	mint,
	pod,
}: {
	amount: number;
	fleetAddress: PublicKey;
	mint: PublicKey;
	pod: CargoPodKind;
}) =>
	Effect.gen(function* () {
		yield* Console.log(`Loading cargo to fleet ${fleetAddress}`);

		const ixs = yield* createDepositCargoToFleetIx(
			fleetAddress,
			mint,
			amount,
			pod,
		);

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		yield* Console.log("Fleet cargo loaded!");

		return txIds;
	});
