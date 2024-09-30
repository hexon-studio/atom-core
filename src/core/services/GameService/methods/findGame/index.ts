import { Data, Effect, pipe } from "effect";
import { SagePrograms } from "../../../../programs";

export class FindGameError extends Data.TaggedError("FindGameError")<{
	readonly error: unknown;
}> {}

export const findGame = pipe(
	SagePrograms,
	Effect.flatMap((programs) =>
		Effect.tryPromise({
			try: () => programs.sage.account.game.all(),
			catch: (error) => new FindGameError({ error }),
		}),
	),
	Effect.head,
);

export type FindGame = typeof findGame;
