import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const dockToStarbase = ({
	fleetNameOrAddress,
}: { fleetNameOrAddress: string | PublicKey }) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		yield* Effect.log(
			`Docking fleet ${fleetAccount.key.toString()} to starbase...`,
		);

		if (!fleetAccount.state.Idle) {
			yield* Effect.log("Fleet can't be docked to starbase");

			return [];
		}

		const ixs = yield* createPreIxs({
			fleetAccount,
			target: "StarbaseLoadingBay",
		});

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const txIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Fleet docked!");

		return txIds;
	});
