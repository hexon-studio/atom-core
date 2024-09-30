import { PublicKey } from "@solana/web3.js";
import type { BN } from "@staratlas/anchor";
import { CargoType } from "@staratlas/cargo";
import { stringToByteArray } from "@staratlas/data-source";
import { ProfileFactionAccount } from "@staratlas/profile-faction";
import {
	Fleet,
	MineItem,
	Resource,
	SagePlayerProfile,
	Sector,
	Starbase,
	StarbasePlayer,
} from "@staratlas/sage";
import { Data, Effect, Option, Record } from "effect";
import { SagePrograms, programIds } from "../../programs";
import { gameContext } from "../../services/GameService/utils";
import { SolanaService } from "../../services/SolanaService";

export const getFleetAddressByName = (fleetName: string) =>
	Effect.all([SagePrograms, gameContext]).pipe(
		Effect.flatMap(([programs, context]) =>
			Effect.try(() => {
				const fleetLabel = stringToByteArray(fleetName, 32);
				const [fleet] = Fleet.findAddress(
					programs.sage,
					context.game.key,
					context.playerProfile,
					fleetLabel,
				);

				return fleet;
			}),
		),
	);

export const getCargoTypeAddress = (
	mint: PublicKey,
	cargoStatsDefinition: PublicKey,
	cargoStatsDefinitionSeqId = 1,
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [cargoType] = CargoType.findAddress(
					programs.cargo,
					cargoStatsDefinition,
					mint,
					cargoStatsDefinitionSeqId,
				);

				return cargoType;
			}),
		),
	);

export const getStarbasePlayerAddress = (
	starbase: PublicKey,
	sagePlayerProfile: PublicKey,
	starbaseSeqId: number,
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [pubKey] = StarbasePlayer.findAddress(
					programs.sage,
					starbase,
					sagePlayerProfile,
					starbaseSeqId,
				);
				return pubKey;
			}),
		),
	);

export const getProfileFactionAddress = (playerProfile: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [pubKey] = ProfileFactionAccount.findAddress(
					programs.profileFaction,
					playerProfile,
				);

				return pubKey;
			}),
		),
	);

export class GetPlayerProfileError extends Data.TaggedError(
	"GetPlayerProfileError",
)<{
	readonly error: unknown;
}> {}

export const getPlayerProfileAddress = (playerPubkey: PublicKey) => {
	return SolanaService.pipe(
		Effect.flatMap((service) => service.anchorProvider),
		Effect.flatMap((provider) =>
			Effect.tryPromise({
				try: () =>
					provider.connection.getProgramAccounts(
						new PublicKey(programIds.playerProfileProgramId),
						{
							filters: [
								{
									memcmp: {
										offset: 30,
										bytes: playerPubkey.toBase58(),
									},
								},
							],
						},
					),
				catch: (error) => new GetPlayerProfileError({ error }),
			}),
		),
		Effect.head,
		Effect.map((accountInfo) => accountInfo.pubkey),
	);
};

export const getSagePlayerProfileAddress = (
	gameId: PublicKey,
	playerProfile: PublicKey,
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [pubKey] = SagePlayerProfile.findAddress(
					programs.sage,
					playerProfile,
					gameId,
				);
				return pubKey;
			}),
		),
	);

export const getMineItemAddress = (gameId: PublicKey, mint: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [mineItem] = MineItem.findAddress(programs.sage, gameId, mint);

				return mineItem;
			}),
		),
	);

export const getStarbaseAddressbyCoordinates = (
	gameId: PublicKey,
	coordinates: [BN, BN],
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [starbase] = Starbase.findAddress(
					programs.sage,
					gameId,
					coordinates,
				);

				return starbase;
			}),
		),
	);
export class PlanetNotFoundError extends Data.TaggedError(
	"PlanetNotFoundError",
)<{
	readonly coordinates: [BN, BN];
}> {}

export const getPlanetAddressbyCoordinates = (coordinates: [BN, BN]) =>
	gameContext.pipe(
		Effect.map((context) => context.planetsLookup),
		Effect.map(Record.get(coordinates.toString())),
		Effect.andThen((maybePlanetAddress) =>
			Option.isSome(maybePlanetAddress)
				? Effect.succeed(maybePlanetAddress.value)
				: Effect.fail(new PlanetNotFoundError({ coordinates })),
		),
	);

export const getResourceAddress = (mint: PublicKey, planet: PublicKey) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [address] = Resource.findAddress(programs.sage, mint, planet);

				return address;
			}),
		),
	);

export const getSectorAddressByCoordinates = (
	gameId: PublicKey,
	coordinates: [BN, BN],
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [address] = Sector.findAddress(
					programs.sage,
					gameId,
					coordinates,
				);

				return address;
			}),
		),
	);
