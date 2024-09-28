import { GetProgramAccountsFilter } from "@solana/web3.js";
import { Data, Effect, pipe } from "effect";
import { SagePrograms } from "../../../../programs";

export class FindFleetsError extends Data.TaggedError("FindFleetsError")<{
  readonly error: unknown;
}> {}

export const findFleets = (filters?: GetProgramAccountsFilter[]) =>
  pipe(
    SagePrograms,
    Effect.flatMap((programs) =>
      Effect.tryPromise({
        try: () => programs.sage.account.fleet.all(filters),
        catch: (error) => new FindFleetsError({ error }),
      })
    )
  );

export type FindFleets = typeof findFleets;
