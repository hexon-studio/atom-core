import type { Fleet } from "@staratlas/sage";
import { Effect, Match, pipe } from "effect";
import { getMineItemAccount, getResourceAccount } from "~/libs/@staratlas/sage";
import { createDockToStarbaseIx } from "./createDockToStarbaseIx";
import { createMovementHandlerIx } from "./createMovementHandlerIx";
import { createStopMiningIx } from "./createStopMiningIx";
import { createUndockFromStarbaseIx } from "./createUndockFromStarbaseIx";
import { FleetIsMovingError } from "~/errors";

type Param = {
	targetState: "StarbaseLoadingBay" | "Idle";
	fleetAccount: Fleet;
};

export const createPreIxs = ({ fleetAccount, targetState }: Param) =>
	Match.value({
		targetState,
		state: fleetAccount.state,
	}).pipe(
		Match.when({ state: { Idle: Match.defined }, targetState: "Idle" }, () =>
			Effect.log("Fleet is already idle, skipping...").pipe(
				Effect.flatMap(() => Effect.succeed([])),
			),
		),
		Match.when(
			{ state: { Idle: Match.defined }, targetState: "StarbaseLoadingBay" },
			() => createDockToStarbaseIx(fleetAccount),
		),
		Match.when(
			{ state: { MoveWarp: Match.defined }, targetState: "Idle" },
			() => createMovementHandlerIx(fleetAccount),
		),
		Match.when(
			{ state: { MoveWarp: Match.defined }, targetState: "StarbaseLoadingBay" },
			({ state: { MoveWarp } }) =>
				Effect.gen(function* () {
					const warpFinish = MoveWarp.warpFinish.toNumber() * 1000;
					const now = Date.now();
					if (warpFinish >= now) {
						return yield* Effect.fail(
							new FleetIsMovingError({
								arrivalTime: new Date(warpFinish).toISOString(),
								movementType: "Warp",
							}),
						);
					}

					const movementIxs = yield* createMovementHandlerIx(fleetAccount);

					const dockedIxs = yield* createDockToStarbaseIx(fleetAccount);

					return [...movementIxs, ...dockedIxs];
				}),
		),
		Match.when(
			{ state: { MoveSubwarp: Match.defined }, targetState: "Idle" },
			() => createMovementHandlerIx(fleetAccount),
		),
		Match.when(
			{
				state: { MoveSubwarp: Match.defined },
				targetState: "StarbaseLoadingBay",
			},
			({ state: { MoveSubwarp } }) =>
				Effect.gen(function* () {
					const arrivalTime = MoveSubwarp.arrivalTime.toNumber() * 1000;
					const now = Date.now();
					if (arrivalTime >= now) {
						return yield* Effect.fail(
							new FleetIsMovingError({
								arrivalTime: new Date(arrivalTime).toISOString(),
								movementType: "Subwarp",
							}),
						);
					}

					const movementIxs = yield* createMovementHandlerIx(fleetAccount);

					const dockedIxs = yield* createDockToStarbaseIx(fleetAccount);

					return [...movementIxs, ...dockedIxs];
				}),
		),
		Match.when(
			{
				state: { StarbaseLoadingBay: { starbase: Match.defined } },
				targetState: "Idle",
			},
			() => createUndockFromStarbaseIx(fleetAccount),
		),
		Match.when(
			{
				state: { StarbaseLoadingBay: { starbase: Match.defined } },
				targetState: "StarbaseLoadingBay",
			},
			() =>
				Effect.log("Fleet is already in StarbaseLoadingBay, skipping...").pipe(
					Effect.flatMap(() => Effect.succeed([])),
				),
		),
		Match.when(
			{ state: { MineAsteroid: Match.defined }, targetState: "Idle" },
			({
				state: {
					MineAsteroid: { resource },
				},
			}) =>
				pipe(
					getResourceAccount(resource),
					Effect.flatMap((resource) =>
						getMineItemAccount(resource.data.mineItem),
					),
					Effect.flatMap((mineItem) =>
						createStopMiningIx({
							resourceMint: mineItem.data.mint,
							fleetAccount,
						}),
					),
				),
		),
		Match.when(
			{
				state: { MineAsteroid: Match.defined },
				targetState: "StarbaseLoadingBay",
			},
			({
				state: {
					MineAsteroid: { resource },
				},
			}) =>
				Effect.gen(function* () {
					const stopMiningIxs = yield* pipe(
						getResourceAccount(resource),
						Effect.flatMap((resource) =>
							getMineItemAccount(resource.data.mineItem),
						),
						Effect.flatMap((mineItem) =>
							createStopMiningIx({
								resourceMint: mineItem.data.mint,
								fleetAccount,
							}),
						),
					);

					const dockedIxs = yield* createDockToStarbaseIx(fleetAccount);

					return [...stopMiningIxs, ...dockedIxs];
				}),
		),
		// Match.when({ state: { Respawn: Match.defined }, targetState: "Idle" }, () =>
		// 	Effect.succeed([]),
		// ),
		// Match.when(
		// 	{ state: { Respawn: Match.defined }, targetState: "StarbaseLoadingBay" },
		// 	() => Effect.succeed([]),
		// ),
		Match.orElse(() => Effect.succeed([])),
	);
