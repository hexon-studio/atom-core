import type { ShipStats } from "@staratlas/sage";
import { Effect, Option, pipe } from "effect";
import { resourceNameToMint } from "../../constants/resources";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createRearmFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const loadAmmo = (fleetName: string, ammoAmount: number) =>
	Effect.gen(function* () {
		const fleetPubkey = yield* getFleetAddressByName(fleetName);

		const fleetAccount = yield* getFleetAccount(fleetPubkey);
		const gameService = yield* GameService;

		const fleetStats = fleetAccount.data.stats as ShipStats;
		const cargoStats = fleetStats.cargoStats;

		// 95% of ammo capacity
		const ammoCapacity = cargoStats.ammoCapacity * 0.95;

		const maybeAmmoAmount = yield* pipe(
			gameService.utils.getParsedTokenAccountsByOwner(
				fleetAccount.data.ammoBank,
			),
			Effect.flatMap(
				Effect.findFirst((account) =>
					Effect.succeed(
						account.mint.toString() ===
							resourceNameToMint.Ammunition.toString(),
					),
				),
			),
			Effect.map(Option.map((account) => account.amount)),
		);

		if (
			Option.isSome(maybeAmmoAmount) &&
			maybeAmmoAmount.value >= ammoCapacity
		) {
			console.log("Skipping add ammo...");
			return yield* Effect.succeed(null);
		}

		console.log("Loading ammo to fleet...");

		const ix = yield* createRearmFleetIx(fleetPubkey, ammoAmount);

		const tx = yield* gameService.utils.buildAndSignTransaction(ix);
		const txId = yield* gameService.utils.sendTransaction(tx);

		return txId;
	});
