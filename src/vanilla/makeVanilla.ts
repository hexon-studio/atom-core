import { Effect, Either, type ManagedRuntime } from "effect";

const mapVanillaError = <A, E, R>(self: Effect.Effect<A, E, R>) =>
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

export const makeVanilla =
	<P extends unknown[], A, E, R>(
		f: (...args: P) => Effect.Effect<A, E, R>,
		runtime: ManagedRuntime.ManagedRuntime<R, never>,
	) =>
	(...args: P) =>
		f(...args).pipe(mapVanillaError, runtime.runPromise);
