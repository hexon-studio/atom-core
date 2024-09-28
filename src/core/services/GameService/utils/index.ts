import { Data, Effect, SynchronizedRef } from "effect";
import { isSome } from "effect/Option";
import { GameService } from "..";

export class GameNotInitializedError extends Data.TaggedError(
  "GameNotInitializedError"
) {}

export const gameContext = GameService.pipe(
  Effect.flatMap((service) => SynchronizedRef.get(service.context)),
  Effect.flatMap((maybeContext) =>
    isSome(maybeContext)
      ? Effect.succeed(maybeContext.value)
      : Effect.fail(new GameNotInitializedError())
  )
);
