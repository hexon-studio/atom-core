import type { PublicKey } from "@solana/web3.js";
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
import { Effect } from "effect";
import { SagePrograms } from "../../programs";
import { getGameContext } from "../../services/GameService/utils";

export const getFleetAddressByName = (fleetName: string) =>
	Effect.all([SagePrograms, getGameContext()]).pipe(
		Effect.flatMap(([programs, context]) =>
			Effect.try(() => {
				const fleetLabel = stringToByteArray(fleetName, 32);

				const [fleet] = Fleet.findAddress(
					programs.sage,
					context.gameInfo.game.key,
					context.playerProfile.key,
					fleetLabel,
				);

				return fleet;
			}),
		),
	);

export const getCargoTypeAddress = (
	mint: PublicKey,
	cargoStatsDefinitionAddress: PublicKey,
	cargoStatsDefinitionseqId = 0,
) =>
	SagePrograms.pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [cargoType] = CargoType.findAddress(
					programs.cargo,
					cargoStatsDefinitionAddress,
					mint,
					cargoStatsDefinitionseqId,
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

// export class GetPlayerProfileError extends Data.TaggedError(
// 	"GetPlayerProfileError",
// )<{
// 	readonly error: unknown;
// }> {}

// export const getPlayerProfileAddress = (playerPubkey: PublicKey) => {
// 	return SolanaService.pipe(
// 		Effect.flatMap((service) => service.anchorProvider),
// 		Effect.flatMap((provider) =>
// 			Effect.tryPromise({
// 				try: () =>
// 					provider.connection.getProgramAccounts(
// 						new PublicKey(programIds.playerProfileProgramId),
// 						{
// 							filters: [
// 								{
// 									memcmp: {
// 										offset: 30,
// 										bytes: playerPubkey.toBase58(),
// 									},
// 								},
// 							],
// 						},
// 					),
// 				catch: (error) => new GetPlayerProfileError({ error }),
// 			}),
// 		),
// 		Effect.head,
// 		Effect.map((accountInfo) => accountInfo.pubkey),
// 	);
// };

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
