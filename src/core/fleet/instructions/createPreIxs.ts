import type { Fleet } from "@staratlas/sage";
import { Effect, Match, pipe } from "effect";
import { getMineItemAccount, getResourceAccount } from "~/libs/@staratlas/sage";
import { createDockToStarbaseIx } from "./createDockToStarbaseIx";
import { createMovementHandlerIx } from "./createMovementHandlerIx";
import { createStopMiningIx } from "./createStopMiningIx";
import { createUndockFromStarbaseIx } from "./createUndockFromStarbaseIx";

type Param = {
	targetState: "StarbaseLoadingBay" | "Idle";
	fleetAccount: Fleet;
};

export const createPreIxs = ({ fleetAccount, targetState: target }: Param) =>
	Match.value({
		target,
		state: fleetAccount.state,
	}).pipe(
		Match.when({ state: { Idle: Match.defined }, target: "Idle" }, () =>
			Effect.log("Fleet is already idle, skipping...").pipe(
				Effect.flatMap(() => Effect.succeed([])),
			),
		),
		Match.when(
			{ state: { Idle: Match.defined }, target: "StarbaseLoadingBay" },
			() => createDockToStarbaseIx(fleetAccount),
		),
		Match.when({ state: { MoveWarp: Match.defined }, target: "Idle" }, () =>
			createMovementHandlerIx(fleetAccount),
		),
		Match.when(
			{ state: { MoveWarp: Match.defined }, target: "StarbaseLoadingBay" },
			() =>
				Effect.gen(function* () {
					const movementIxs = yield* createMovementHandlerIx(fleetAccount);

					const dockedIxs = yield* createDockToStarbaseIx(fleetAccount);

					return [...movementIxs, ...dockedIxs];
				}),
		),
		Match.when({ state: { MoveSubwarp: Match.defined }, target: "Idle" }, () =>
			createMovementHandlerIx(fleetAccount),
		),
		Match.when(
			{ state: { MoveSubwarp: Match.defined }, target: "StarbaseLoadingBay" },
			() =>
				Effect.gen(function* () {
					const movementIxs = yield* createMovementHandlerIx(fleetAccount);

					const dockedIxs = yield* createDockToStarbaseIx(fleetAccount);

					return [...movementIxs, ...dockedIxs];
				}),
		),
		Match.when(
			{
				state: { StarbaseLoadingBay: { starbase: Match.defined } },
				target: "Idle",
			},
			() => createUndockFromStarbaseIx(fleetAccount),
		),
		Match.when(
			{
				state: { StarbaseLoadingBay: { starbase: Match.defined } },
				target: "StarbaseLoadingBay",
			},
			() =>
				Effect.log("Fleet is already in StarbaseLoadingBay, skipping...").pipe(
					Effect.flatMap(() => Effect.succeed([])),
				),
		),
		Match.when(
			{ state: { MineAsteroid: Match.defined }, target: "Idle" },
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
				target: "StarbaseLoadingBay",
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
		// Match.when({ state: { Respawn: Match.defined }, target: "Idle" }, () =>
		// 	Effect.succeed([]),
		// ),
		// Match.when(
		// 	{ state: { Respawn: Match.defined }, target: "StarbaseLoadingBay" },
		// 	() => Effect.succeed([]),
		// ),
		Match.orElse(() => Effect.succeed([])),
	);
