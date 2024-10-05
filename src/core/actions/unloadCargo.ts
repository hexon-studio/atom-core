import type { PublicKey } from "@solana/web3.js";
import { Console, Effect } from "effect";
import type { CargoPodKind } from "../../types";
import { isPublicKey } from "../../utils/public-key";
import { createWithdrawCargoFromFleetIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";

export const unloadCargo = ({
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
			`Unloading cargo ${amount} from fleet ${fleetNameOrAddress.toString()}`,
		);

		const ix = yield* createWithdrawCargoFromFleetIx({
			fleetAddress,
			resourceMint,
			amount,
			cargoPodKind,
		});

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ix);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log("Fleet cargo unloaded!");

		return txIds;
	});
