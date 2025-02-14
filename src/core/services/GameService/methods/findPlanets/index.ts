import { readAllFromRPC } from "@staratlas/data-source";
import { Planet } from "@staratlas/sage";
import { Effect, pipe } from "effect";
import { FindPlanetsError } from "~/errors";
import { getSagePrograms } from "../../../../programs";
import { SolanaService } from "../../../SolanaService";

export const findAllPlanets = () =>
	pipe(
		Effect.all([getSagePrograms(), SolanaService.anchorProvider]),
		Effect.flatMap(([programs, provider]) =>
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
	);

export type FindPlanets = typeof findAllPlanets;
