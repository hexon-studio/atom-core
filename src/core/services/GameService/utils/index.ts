import { Effect, identity } from "effect";
import { GameNotInitializedError } from "~/errors";
import { GameService } from "..";

export const getGameContext = () =>
	GameService.gameContext.pipe(
		Effect.flatMap(identity),
		Effect.mapError(() => new GameNotInitializedError()),
	);
