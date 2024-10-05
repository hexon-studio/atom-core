import { readAllFromRPC } from "@staratlas/data-source";
import { Planet } from "@staratlas/sage";
import { Data, Effect, pipe } from "effect";
import { SagePrograms } from "../../../../programs";
import { SolanaService } from "../../../SolanaService";

export class FindPlanetsError extends Data.TaggedError("FindPlanetsError")<{
	readonly error: unknown;
}> {}

export const findAllPlanets = () =>
	pipe(
		Effect.all([SagePrograms, SolanaService]),
		Effect.flatMap(([programs, service]) =>
			service.anchorProvider.pipe(
				Effect.flatMap((provider) =>
					Effect.tryPromise({
						try: async () => {
							const allPlanets = await readAllFromRPC(
								provider.connection,
								programs.sage,
								Planet,
								"confirmed",
							);

							const planets = allPlanets.flatMap((planet) =>
								planet.type === "ok" ? [planet.data] : [],
							);

							return planets;
						},
						catch: (error) => new FindPlanetsError({ error }),
					}),
				),
			),
		),
	);

export type FindPlanets = typeof findAllPlanets;
