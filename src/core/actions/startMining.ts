import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect, Match } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import {
	createStartMiningIx,
	createUndockFromStarbaseIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
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

		// TODO: Not enough resources to star mining (fuel, ammo, food)

		if (fleetAccount.state.MineAsteroid) {
			yield* Effect.log(
				`Fleet is already mining on asteroid (${fleetAccount.state.MineAsteroid.asteroid}). Skipping...`,
			);

			return [];
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* Match.value(fleetAccount.state).pipe(
			Match.when({ StarbaseLoadingBay: Match.defined }, () =>
				createUndockFromStarbaseIx(fleetAccount).pipe(Effect.map((ix) => [ix])),
			),
			Match.orElse(() => Effect.succeed([])),
		);

		ixs.push(...preIxs);

		const miningIxs = yield* createStartMiningIx({
			fleetAccount,
			resourceMint,
		});

		ixs.push(...miningIxs);

		const gameService = yield* GameService;

		const drainVaultIx = yield* createDrainVaultIx(ixs, resourceMint);

		ixs.push(...drainVaultIx);

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		yield* Effect.log("Mining started!");

		return txIds;
	});
