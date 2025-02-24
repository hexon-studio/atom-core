import type { PublicKey } from "@solana/web3.js";
import { Effect, unsafeCoerce } from "effect";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { resourceMintByName } from "~/utils/resources";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { createStartMiningIx } from "../fleet/instructions/createStartMiningIx";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const startMining = ({
	fleetNameOrAddress,
	resourceNameOrMint,
}: {
	fleetNameOrAddress: string | PublicKey;
	resourceNameOrMint: string | PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Effect.log(`Start mining ${resourceNameOrMint.toString()}...`);

		const resourceMint =
			typeof resourceNameOrMint === "string"
				? resourceMintByName(unsafeCoerce(resourceNameOrMint))
				: resourceNameOrMint;

		const fleetAccount =
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

		// TODO: Not enough resources to start mining (fuel, ammo, food)

		if (fleetAccount.state.MineAsteroid) {
			yield* Effect.log(
				`Fleet is already mining on asteroid (${fleetAccount.state.MineAsteroid.asteroid}). Skipping...`,
			);

			return { signatures: [] };
		}

		const preIxs = yield* createPreIxs({
			fleetAccount,
			targetState: "Idle",
		});

		const startMiningIxs = yield* createStartMiningIx({
			fleetAccount,
			resourceMint,
		});

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs: [...preIxs, ...startMiningIxs],
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* GameService.sendAllTransactions(txs);

		yield* Effect.log("Mining started!");

		return { signatures };
	});
