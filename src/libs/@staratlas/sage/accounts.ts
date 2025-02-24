import type { PublicKey } from "@solana/web3.js";
import {
	Fleet,
	Game,
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

export const fetchGameAccount = (gamePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gamePublicKey, Game),
		),
	);

export const fetchFleetAccountByNameOrAddress = (
	fleetNameOrAddress: string | PublicKey,
) =>
	(isPublicKey(fleetNameOrAddress)
		? Effect.succeed(fleetNameOrAddress)
		: findFleetPdaByName(fleetNameOrAddress).pipe(
				Effect.map(([fleetAddress]) => fleetAddress),
			)
	).pipe(Effect.flatMap(fetchFleetAccount));

export const fetchFleetAccount = (fleetPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, fleetPubkey, Fleet),
		),
		Effect.tap((fleet) =>
			Effect.log("Fleet fetched.").pipe(Effect.annotateLogs({ fleet })),
		),
	);

export const fetchMineItemAccount = (mineItemPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, mineItemPubkey, MineItem),
		),
	);

export const fetchPlanetAccount = (planetPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, planetPubkey, Planet),
		),
	);

export const fetchResourceAccount = (resourcePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, resourcePubkey, Resource),
		),
	);

export const fetchSectorAccount = (sectorPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, sectorPubkey, Sector),
		),
	);

export const fetchStarbaseAccount = (starbasePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePubkey, Starbase),
		),
	);

export const fetchStarbasePlayerAccount = (starbasePlayerPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePlayerPubkey, StarbasePlayer),
		),
	);
