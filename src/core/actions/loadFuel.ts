import { ShipStats } from "@staratlas/sage";
import { Effect, Option, pipe } from "effect";
import { resourceNameToMint } from "../../constants/resources";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createRefuelFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const loadFuel = (fleetName: string, fuelAmount: number) =>
  Effect.gen(function* () {
    const fleetPubkey = yield* getFleetAddressByName(fleetName);
    const fleetAccount = yield* getFleetAccount(fleetPubkey);
    const gameService = yield* GameService;

    const fleetStats = fleetAccount.data.stats as ShipStats;
    const cargoStats = fleetStats.cargoStats;

    // 95% of fuel capacity
    const fuelCapacity = cargoStats.fuelCapacity * 0.95;

    const maybeFuelAmount = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(
        fleetAccount.data.fuelTank
      ),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(
            account.mint.toString() === resourceNameToMint.Fuel.toString()
          )
        )
      ),
      Effect.map(Option.map((account) => account.amount))
    );

    if (
      Option.isSome(maybeFuelAmount) &&
      maybeFuelAmount.value >= fuelCapacity
    ) {
      console.log("Skipping add fuel...");
      return yield* Effect.succeed(null);
    }

    console.log("Loading fuel to fleet...");

    const ix = yield* createRefuelFleetIx(fleetPubkey, fuelAmount);

    const tx = yield* gameService.utils.buildAndSignTransaction(ix);

    const txId = yield* gameService.utils.sendTransaction(tx);

    return txId;
  });
