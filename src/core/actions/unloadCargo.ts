import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Console, Effect } from "effect";
import type { CargoPodKind } from "../../types";
import { isPublicKey } from "../../utils/public-key";
import {
	createDockToStarbaseIx,
	createWithdrawCargoFromFleetIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAccount } from "../utils/accounts";
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

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		const ixs: InstructionReturn[] = [];

		const dockIxs = yield* createDockToStarbaseIx(fleetAccount);

		ixs.push(...dockIxs);

		const unloadCargoIxs = yield* createWithdrawCargoFromFleetIx({
			fleetAccount,
			resourceMint,
			amount,
			cargoPodKind,
		});

		ixs.push(...unloadCargoIxs);

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log("Fleet cargo unloaded!");

		return txIds;
	});
