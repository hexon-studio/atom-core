import { Effect, Either } from "effect";

export const toVanillaError = <A, E, R>(self: Effect.Effect<A, E, R>) =>
	self.pipe(
		Effect.either,
		Effect.map(
			Either.match({
				onLeft: (error) =>
					({ status: "error", error, data: undefined }) as const,
				onRight: (data) =>
					({ status: "success", data, error: undefined }) as const,
			}),
		),
	);
