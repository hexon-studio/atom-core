import type { PublicKey, TransactionConfirmationStatus } from "@solana/web3.js";
import type { Idl, Program } from "@staratlas/anchor";
import { CargoPod, CargoStatsDefinition, CargoType } from "@staratlas/cargo";
import {
	type Account,
	type AccountStatic,
	readFromRPCOrError,
} from "@staratlas/data-source";
import { PlayerProfile } from "@staratlas/player-profile";
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
import { Data, Effect } from "effect";
import { isPublicKey } from "../../../utils/public-key";
import { SagePrograms } from "../../programs";
import { getFleetAddressByName } from "../pdas";

export class ReadFromRPCError extends Data.TaggedError("ReadFromRPCError")<{
	readonly error: unknown;
	readonly accountName: string;
}> {
	override get message() {
		return `Error reading: ${this.accountName}, from RPC: ${this.error}`;
	}
}

export const readFromSage = <A extends Account, IDL extends Idl>(
	program: Program<IDL>,
	resourceKey: PublicKey,
	resourceType: AccountStatic<A, IDL>,
	commitment: TransactionConfirmationStatus = "confirmed",
) =>
	Effect.tryPromise({
		try: () =>
			readFromRPCOrError(
				program.provider.connection,
				program,
				resourceKey,
				resourceType,
				commitment,
			),
		catch: (error) =>
			new ReadFromRPCError({
				error,
				accountName: resourceType.ACCOUNT_NAME,
			}),
	});

export const getGameAccount = (gamePublicKey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gamePublicKey, Game),
		),
	);

export const getGameStateAccount = (gameStatePublicKey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gameStatePublicKey, GameState),
		),
	);

export const getCargoStatsDefinitionAccount = (
	cargoStatsDefPublicKey: PublicKey,
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(
				programs.cargo,
				cargoStatsDefPublicKey,
				CargoStatsDefinition,
			),
		),
	);

export const getFleetAccountByNameOrAddress = (
	fleetNameOrAddress: string | PublicKey,
) =>
	(isPublicKey(fleetNameOrAddress)
		? Effect.succeed(fleetNameOrAddress)
		: getFleetAddressByName(fleetNameOrAddress)
	).pipe(Effect.flatMap(getFleetAccount));

export const getFleetAccount = (fleetPubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, fleetPubkey, Fleet),
		),
	).pipe(
		Effect.tap((fleet) =>
			Effect.log("Fleet fetched.").pipe(Effect.annotateLogs({ fleet })),
		),
	);

export const getMineItemAccount = (mineItemPubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, mineItemPubkey, MineItem),
		),
	);

export const getPlanetAccount = (planetPubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, planetPubkey, Planet),
		),
	);

export const getResourceAccount = (resourcePubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, resourcePubkey, Resource),
		),
	);

export const getSectorAccount = (sectorPubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, sectorPubkey, Sector),
		),
	);

export const getStarbaseAccount = (starbasePubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePubkey, Starbase),
		),
	);

export const getStarbasePlayerAccount = (starbasePlayerPubkey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePlayerPubkey, StarbasePlayer),
		),
	);

export const getCargoPodAccount = (cargoPodPublicKey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.cargo, cargoPodPublicKey, CargoPod),
		),
	);

export const getCargoTypeAccount = (cargoTypePublicKey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.cargo, cargoTypePublicKey, CargoType),
		),
	);

export const getPlayerProfileAccout = (playeProfilePublicKey: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			readFromSage(
				programs.playerProfile,
				playeProfilePublicKey,
				PlayerProfile,
			),
		),
	);
