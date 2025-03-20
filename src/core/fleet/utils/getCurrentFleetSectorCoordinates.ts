import type { FleetStateData } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Match } from "effect";
import {
	fetchPlanetAccount,
	fetchStarbaseAccount,
} from "~/libs/@staratlas/sage";

export const getCurrentFleetSectorCoordinates = (
	fleetState: Readonly<FleetStateData>,
) => {
	return Match.value(fleetState).pipe(
		Match.when({ MoveWarp: Match.defined }, ({ MoveWarp: { toSector } }) =>
			Effect.succeed(toSector as [BN, BN]),
		),
		Match.when(
			{ MoveSubwarp: Match.defined },
			({ MoveSubwarp: { toSector } }) => Effect.succeed(toSector as [BN, BN]),
		),
		Match.when(
			{ StarbaseLoadingBay: { starbase: Match.defined } },
			({ StarbaseLoadingBay: { starbase } }) =>
				fetchStarbaseAccount(starbase).pipe(
					Effect.map((starbase) => starbase.data.sector as [BN, BN]),
				),
		),
		Match.when({ Idle: Match.defined }, ({ Idle: { sector } }) =>
			Effect.succeed(sector as [BN, BN]),
		),
		Match.when({ Respawn: Match.defined }, ({ Respawn: { sector } }) =>
			Effect.succeed(sector as [BN, BN]),
		),
		Match.when(
			{ MineAsteroid: Match.defined },
			({ MineAsteroid: { asteroid } }) =>
				fetchPlanetAccount(asteroid).pipe(
					Effect.map((planet) => planet.data.sector as [BN, BN]),
				),
		),
		Match.exhaustive,
	);
};
