import { Data, Effect, pipe } from "effect";
import { SagePrograms } from "../../../../programs";

export class GameNotFoundError extends Data.TaggedError("FindGameError")<{
	readonly error: unknown;
}> {}

export const findGame = pipe(
	SagePrograms,
	Effect.flatMap((programs) =>
		Effect.tryPromise({
			try: () => programs.sage.account.game.all(),
			catch: (error) => new GameNotFoundError({ error }),
		}),
	),
	Effect.head,
	Effect.catchTag("NoSuchElementException", (error) =>
		Effect.fail(new GameNotFoundError({ error })),
	),
);

export type FindGame = typeof findGame;
