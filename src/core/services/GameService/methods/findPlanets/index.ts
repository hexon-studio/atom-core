import { GetProgramAccountsFilter } from "@solana/web3.js";
import { Data, Effect, pipe } from "effect";
import { SagePrograms } from "../../../../programs";

export class FindPlanetsError extends Data.TaggedError("FindPlanetsError")<{
  readonly error: unknown;
}> {}

export const findPlanets = (filters?: GetProgramAccountsFilter[]) =>
  pipe(
    SagePrograms,
    Effect.flatMap((programs) =>
      Effect.tryPromise({
        try: () => programs.sage.account.planet.all(filters),
        catch: (error) => new FindPlanetsError({ error }),
      })
    )
  );

export type FindPlanets = typeof findPlanets;
