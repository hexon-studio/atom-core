import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const stopMining = ({
	fleetNameOrAddress,
}: {
	fleetNameOrAddress: string | PublicKey;
}) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		if (!fleetAccount.state.MineAsteroid) {
			yield* Effect.log("Fleet is not mining on asteroid");

			return { signatures: [] };
		}

		yield* Effect.log("Stop mining...");

		const ixs = yield* createPreIxs({
			fleetAccount,
			target: "Idle",
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

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Mining stopped!");

		return { signatures };
	});
