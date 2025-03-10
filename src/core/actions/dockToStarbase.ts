import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const dockToStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		yield* Effect.log("Start docking...");

		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		// yield* assertRentIsValid(fleetAccount);

		yield* Effect.log(
			`Docking fleet ${fleetAccount.key.toString()} to starbase...`,
		);

		const ixs = yield* createPreIxs({
			fleetAccount,
			targetState: "StarbaseLoadingBay",
		});

		if (ixs.length === 0) {
			return { signatures: [] };
		}

		const afterIxs = yield* createAfterIxs();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Fleet docked successfully");

		return { signatures };
	});
