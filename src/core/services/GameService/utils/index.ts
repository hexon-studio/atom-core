import { Data, Effect, Option, Ref } from "effect";
import { GameService } from "..";

export class GameNotInitializedError extends Data.TaggedError(
	"GameNotInitializedError",
) {}

export const getGameContext = () =>
	GameService.pipe(
		Effect.flatMap((service) => Ref.get(service.context)),
		Effect.flatMap(
			Option.match({
				onSome: (context) => Effect.succeed(context),
				onNone: () => Effect.fail(new GameNotInitializedError()),
			}),
		),
	);
