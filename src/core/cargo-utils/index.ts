import { PublicKey } from "@solana/web3.js";
import { BN } from "@staratlas/anchor";
import {
  CargoStats,
  Fleet,
  getCargoPodsByAuthority as sageGetCargoPodsByAuthority,
} from "@staratlas/sage";
import { Data, Effect, Match } from "effect";
import { CargoPodKind } from "../../types";
import {
  getCargoPodAccount,
  getCargoTypeAccount,
} from "../fleet-utils/accounts";
import { SagePrograms } from "../programs";
import { GameService } from "../services/GameService";
import { SolanaService } from "../services/SolanaService";

class GetCargoPodsByAuthorityError extends Data.TaggedError(
  "GetCargoPodsByAuthorityError"
)<{ error: unknown }> {}

export const getCargoPodsByAuthority = (authority: PublicKey) =>
  SolanaService.pipe(
    Effect.flatMap((service) =>
      Effect.all([service.anchorProvider, SagePrograms])
    ),
    Effect.flatMap(([provider, programs]) =>
      Effect.tryPromise({
        try: () =>
          sageGetCargoPodsByAuthority(
            provider.connection,
            programs.cargo,
            authority
          ),
        catch: (error) => new GetCargoPodsByAuthorityError({ error }),
      }).pipe(Effect.head)
    )
  );

class InvalidPodMaxCapacityError extends Data.TaggedError(
  "InvalidPodMaxCapacityError"
) {}

export const getCurrentCargoDataByType = ({
  type,
  fleetAccount,
}: {
  type: CargoPodKind;
  fleetAccount: Fleet;
}) =>
  Effect.gen(function* () {
    const cargoPodType = Match.value(type).pipe(
      Match.when("ammo_bank", () => fleetAccount.data.ammoBank),
      Match.when("cargo_hold", () => fleetAccount.data.cargoHold),
      Match.when("fuel_tank", () => fleetAccount.data.fuelTank),
      Match.exhaustive
    );

    const cargoStats = fleetAccount.data.stats.cargoStats as CargoStats;

    const cargoPodMaxCapacity: BN = Match.value(type).pipe(
      Match.when("ammo_bank", () => new BN(cargoStats.ammoCapacity)),
      Match.when("cargo_hold", () => new BN(cargoStats.cargoCapacity)),
      Match.when("fuel_tank", () => new BN(cargoStats.fuelCapacity)),
      Match.orElse(() => new BN(0))
    );

    if (cargoPodMaxCapacity.eq(new BN(0))) {
      return yield* Effect.fail(new InvalidPodMaxCapacityError());
    }

    const cargoPod = yield* getCargoPodAccount(cargoPodType);

    const gameService = yield* GameService;

    const cargoPodTokenAccounts =
      yield* gameService.utils.getParsedTokenAccountsByOwner(cargoPod.key);

    // if (!cargoPodTokenAccounts.length) {
    //   const cpe: CargoPodEnhanced = {
    //     key: cargoPod.data.key,
    //     loadedAmount: new BN(0),
    //     resources: [],
    //     maxCapacity: cargoPodMaxCapacity,
    //     fullLoad: false,
    //   };
    //   return {
    //     type: "Success" as const,
    //     data: cpe,
    //   };
    // }

    const resources = [];

    for (const cargoPodTokenAccount of cargoPodTokenAccounts) {
      const cargoType = yield* getCargoTypeAccount(cargoPodTokenAccount.mint);

      const resourceSpaceInCargoPerUnit = cargoType.stats[0] as BN;

      resources.push({
        mint: cargoPodTokenAccount.mint,
        amount: new BN(cargoPodTokenAccount.amount),
        spaceInCargo: new BN(cargoPodTokenAccount.amount).mul(
          resourceSpaceInCargoPerUnit
        ),
        cargoTypeKey: cargoType.key,
        tokenAccountKey: cargoPodTokenAccount.address,
      });
    }

    let loadedAmount = new BN(0);
    resources.forEach((item) => {
      loadedAmount = loadedAmount.add(item.spaceInCargo);
    });

    // const cpe: CargoPodEnhanced = {
    const cpe = {
      key: cargoPod.key,
      loadedAmount,
      resources,
      maxCapacity: cargoPodMaxCapacity,
      fullLoad: loadedAmount.eq(cargoPodMaxCapacity),
    };

    return cpe;
  });
