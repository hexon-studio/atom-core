import { PublicKey } from "@solana/web3.js";
import { PlanetType } from "@staratlas/sage";
import { Data, Effect, Option, SynchronizedRef } from "effect";
import { GameContext } from "../..";
import { getGameAccount } from "../../../../fleet-utils/accounts";
import { findGame } from "../findGame";
import { findPlanets } from "../findPlanets";

class AlreadyInitializedError extends Data.TaggedError(
  "AlreadyInitializedError"
) {}

export const initGame = (
  contextRef: SynchronizedRef.SynchronizedRef<Option.Option<GameContext>>
) =>
  Effect.gen(function* (_) {
    const context = yield* _(SynchronizedRef.get(contextRef));

    if (Option.isSome(context)) {
      return yield* _(Effect.fail(new AlreadyInitializedError()));
    }

    const gameAccount = yield* _(findGame);

    const game = yield* _(getGameAccount(gameAccount.publicKey));

    const planets = yield* _(findPlanets());

    const planetsLookup = yield* _(
      Effect.reduce(
        planets,
        {} as Record<string, PublicKey>,
        (lookup, planetAccount) => {
          const pubkey = planetAccount.publicKey;
          const planet = planetAccount.account;

          if (planet.planetType === PlanetType.AsteroidBelt) {
            const sector = planet.sector.toString();
            lookup[sector] = pubkey;
          }

          return Effect.succeed(lookup);
        }
      )
    );

    // const pointsProgram=yield* SagePrograms;
    // const points = readAllFromRPC(, pointsProgram, UserPoints);

    return yield* _(
      SynchronizedRef.updateAndGet(contextRef, () =>
        Option.some({
          game,
          planetsLookup,
        })
      )
    );
  });

export type InitGame = typeof initGame;
