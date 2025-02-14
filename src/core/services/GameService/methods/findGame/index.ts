import { Effect, pipe } from "effect";
import { GameNotFoundError } from "~/errors";
import { getSagePrograms } from "../../../../programs";

export const findGame = pipe(
	getSagePrograms(),
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
