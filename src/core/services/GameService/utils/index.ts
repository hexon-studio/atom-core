import { Data, Effect, identity } from "effect";
import { GameService } from "..";

export class GameNotInitializedError extends Data.TaggedError(
	"GameNotInitializedError",
) {}

export const getGameContext = () =>
	GameService.gameContext.pipe(
		Effect.flatMap(identity),
		Effect.mapError(() => new GameNotInitializedError()),
	);
