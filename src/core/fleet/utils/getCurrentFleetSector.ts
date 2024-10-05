import type { Fleet } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Match } from "effect";
import { getPlanetAccount, getStarbaseAccount } from "../../utils/accounts";

export const getCurrentFleetSectorCoordinates = (fleet: Fleet) => {
	return Match.value(fleet.state).pipe(
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
				getStarbaseAccount(starbase).pipe(
					Effect.map((starebase) => starebase.data.sector as [BN, BN]),
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
				getPlanetAccount(asteroid).pipe(
					Effect.map((planet) => planet.data.sector as [BN, BN]),
				),
		),
		Match.exhaustive,
	);
};
