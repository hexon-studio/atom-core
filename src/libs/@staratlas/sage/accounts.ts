import type { PublicKey } from "@solana/web3.js";
import {
	Fleet,
	Game,
	GameState,
	MineItem,
	Planet,
	Resource,
	Sector,
	Starbase,
	StarbasePlayer,
} from "@staratlas/sage";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { readFromSage } from "~/libs/@staratlas/data-source";
import { isPublicKey } from "~/utils/public-key";
import { findFleetPdaByName } from "./pdas";

export const getGameAccount = (gamePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gamePublicKey, Game),
		),
	);

export const getGameStateAccount = (gameStatePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gameStatePublicKey, GameState),
		),
	);

export const getFleetAccountByNameOrAddress = (
	fleetNameOrAddress: string | PublicKey,
) =>
	(isPublicKey(fleetNameOrAddress)
		? Effect.succeed(fleetNameOrAddress)
		: findFleetPdaByName(fleetNameOrAddress).pipe(
				Effect.map(([fleetAddress]) => fleetAddress),
			)
	).pipe(Effect.flatMap(getFleetAccount));

export const getFleetAccount = (fleetPubkey: PublicKey) =>
	getSagePrograms()
		.pipe(
			Effect.flatMap((programs) =>
				readFromSage(programs.sage, fleetPubkey, Fleet),
			),
		)
		.pipe(
			Effect.tap((fleet) =>
				Effect.log("Fleet fetched.").pipe(Effect.annotateLogs({ fleet })),
			),
		);

export const getMineItemAccount = (mineItemPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, mineItemPubkey, MineItem),
		),
	);

export const getPlanetAccount = (planetPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, planetPubkey, Planet),
		),
	);

export const getResourceAccount = (resourcePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, resourcePubkey, Resource),
		),
	);

export const getSectorAccount = (sectorPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, sectorPubkey, Sector),
		),
	);

export const getStarbaseAccount = (starbasePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePubkey, Starbase),
		),
	);

export const getStarbasePlayerAccount = (starbasePlayerPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePlayerPubkey, StarbasePlayer),
		),
	);
