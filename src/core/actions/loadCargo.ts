import type { PublicKey } from "@solana/web3.js";
import { Console, Data, Effect } from "effect";
import type { CargoPodKind } from "../../types";
import { isPublicKey } from "../../utils/public-key";
import { createDepositCargoToFleetIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";

export class BuildOptinalTxError extends Data.TaggedError(
	"BuildOptinalTxError",
)<{ error: unknown }> {
	override get message() {
		return String(this.error);
	}
}

export const loadCargo = ({
	amount,
	fleetNameOrAddress,
	resourceMint,
	cargoPodKind,
}: {
	amount: number;
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
	cargoPodKind: CargoPodKind;
}) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		yield* Console.log(
			`Loading cargo to fleet ${fleetNameOrAddress.toString()}`,
		);

		const ixs = yield* createDepositCargoToFleetIx({
			amount,
			fleetAddress,
			resourceMint,
			cargoPodKind,
		});

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		yield* Console.log("Fleet cargo loaded!");

		return txIds;
	});
