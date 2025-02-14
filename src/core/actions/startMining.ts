import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createStartMiningIx } from "../fleet/instructions";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const startMining = ({
	fleetNameOrAddress,
	resourceMint,
}: {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Effect.log(`Start mining ${resourceMint}...`);

		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		// TODO: Not enough resources to start mining (fuel, ammo, food)

		if (fleetAccount.state.MineAsteroid) {
			yield* Effect.log(
				`Fleet is already mining on asteroid (${fleetAccount.state.MineAsteroid.asteroid}). Skipping...`,
			);

			return { signatures: [] };
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* createPreIxs({ fleetAccount, target: "Idle" });

		ixs.push(...preIxs);

		const miningIxs = yield* createStartMiningIx({
			fleetAccount,
			resourceMint,
		});

		ixs.push(...miningIxs);

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

		yield* Effect.log("Mining started!");

		return { signatures };
	});
