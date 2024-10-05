import type { FleetStateData } from "@staratlas/sage";
import { Match } from "effect";

export const getCurrentFleetStateName = Match.type<
	Readonly<FleetStateData>
>().pipe(
	Match.when({ MoveWarp: Match.defined }, () => "MoveWarp" as const),
	Match.when({ MoveSubwarp: Match.defined }, () => "MoveSubwarp" as const),
	Match.when(
		{ StarbaseLoadingBay: { starbase: Match.defined } },
		() => "StarbaseLoadingBay" as const,
	),
	Match.when({ Idle: Match.defined }, () => "Idle" as const),
	Match.when({ Respawn: Match.defined }, () => "Respawn" as const),
	Match.when({ MineAsteroid: Match.defined }, () => "MineAsteroid" as const),
	Match.exhaustive,
);
