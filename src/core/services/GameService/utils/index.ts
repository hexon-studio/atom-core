import { Data, Effect, Ref, identity } from "effect";
import { GameService } from "..";

export class GameNotInitializedError extends Data.TaggedError(
	"GameNotInitializedError",
) {}

export const getGameContext = () =>
	GameService.pipe(
		Effect.flatMap((service) => Ref.get(service.context)),
		Effect.flatMap(identity),
		Effect.mapError(() => new GameNotInitializedError()),
	);
