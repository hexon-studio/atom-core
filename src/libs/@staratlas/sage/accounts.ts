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
import {
	GameAccountError,
	GameStateAccountError,
	FleetAccountError,
	MineItemAccountError,
	PlanetAccountError,
	ResourceAccountError,
	SectorAccountError,
	StarbaseAccountError,
	StarbasePlayerAccountError,
	FleetAccountByNameError,
} from "~/errors/accounts";
import type { ReadFromRPCError } from "~/errors";

export const getGameAccount = (gamePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gamePublicKey, Game),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(new GameAccountError({ error: error.error, gamePublicKey })),
		),
	);

export const getGameStateAccount = (gameStatePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gameStatePublicKey, GameState),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new GameStateAccountError({ error: error.error, gameStatePublicKey }),
			),
		),
	);

export const getFleetAccountByNameOrAddress = (
	fleetNameOrAddress: string | PublicKey,
) =>
	(isPublicKey(fleetNameOrAddress)
		? Effect.succeed(fleetNameOrAddress)
		: findFleetPdaByName(fleetNameOrAddress).pipe(
				Effect.map(([fleetAddress]) => fleetAddress),
				Effect.mapError(
					(error) =>
						new FleetAccountByNameError({
							error,
							fleetName: fleetNameOrAddress as string,
						}),
				),
			)
	).pipe(Effect.flatMap(getFleetAccount));

export const getFleetAccount = (fleetPubkey: PublicKey) =>
	getSagePrograms()
		.pipe(
			Effect.flatMap((programs) =>
				readFromSage(programs.sage, fleetPubkey, Fleet),
			),
			Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
				Effect.fail(new FleetAccountError({ error: error.error, fleetPubkey })),
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
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new MineItemAccountError({ error: error.error, mineItemPubkey }),
			),
		),
	);

export const getPlanetAccount = (planetPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, planetPubkey, Planet),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(new PlanetAccountError({ error: error.error, planetPubkey })),
		),
	);

export const getResourceAccount = (resourcePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, resourcePubkey, Resource),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new ResourceAccountError({ error: error.error, resourcePubkey }),
			),
		),
	);

export const getSectorAccount = (sectorPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, sectorPubkey, Sector),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(new SectorAccountError({ error: error.error, sectorPubkey })),
		),
	);

export const getStarbaseAccount = (starbasePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePubkey, Starbase),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new StarbaseAccountError({ error: error.error, starbasePubkey }),
			),
		),
	);

export const getStarbasePlayerAccount = (starbasePlayerPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePlayerPubkey, StarbasePlayer),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new StarbasePlayerAccountError({
					error: error.error,
					starbasePlayerPubkey,
				}),
			),
		),
	);
