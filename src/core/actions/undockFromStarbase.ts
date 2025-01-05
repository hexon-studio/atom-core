import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createUndockFromStarbaseIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const undockFromStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		if (!fleetAccount.state.StarbaseLoadingBay) {
			yield* Effect.log("Fleet can't be undocked from starbase");

			return [];
		}

		const ixs: InstructionReturn[] = [];

		yield* Effect.log("Undocking from starbase...");

		const ix = yield* createUndockFromStarbaseIx(fleetAccount);

		ixs.push(ix);

		const drainVaultIx = yield* createDrainVaultIx();

		const txs = yield* GameService.buildAndSignTransactionWithAtlasPrime({
			ixs,
			afterIxs: drainVaultIx,
		});

		const txIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Fleet undocked!");

		return txIds;
	});
