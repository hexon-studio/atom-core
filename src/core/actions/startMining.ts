import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { createStartMiningIx } from "../fleet/instructions/createStartMiningIx";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const startMining = ({
	fleetNameOrAddress,
	resourceMint,
}: {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Effect.log(`Start mining ${resourceMint.toString()}...`);

		const fleetAccount =
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

		// yield* assertRentIsValid(fleetAccount);

		// TODO: Not enough resources to start mining (fuel, ammo, food)

		if (fleetAccount.state.MineAsteroid) {
			yield* Effect.log(
				`Fleet is already mining on asteroid (${fleetAccount.state.MineAsteroid.asteroid}). Skipping...`,
			);

			return { signatures: [] };
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* createPreIxs({
			fleetAccount,
			targetState: "Idle",
		});

		ixs.push(...preIxs);

		const startMiningIxs = yield* createStartMiningIx({
			fleetAccount,
			resourceMint,
		});

		ixs.push(...startMiningIxs);

		const afterIxs = yield* createAfterIxs();

		const { options } = yield* getGameContext();

		const maxIxsPerTransaction =
			options.kind === "exec" ? options.maxIxsPerTransaction : 1;

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Mining started!");

		return { signatures };
	});
