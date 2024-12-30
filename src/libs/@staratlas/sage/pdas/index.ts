import type { PublicKey } from "@solana/web3.js";
import {
	MineItem,
	Resource,
	SagePlayerProfile,
	Sector,
	Starbase,
	StarbasePlayer,
} from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";

export * from "./getFleetAddressByName";
export const getSagePlayerProfileAddress = (
	gameId: PublicKey,
	playerProfile: PublicKey,
) =>
	getSagePrograms().pipe(
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

export const getStarbasePlayerAddress = (
	starbase: PublicKey,
	sagePlayerProfile: PublicKey,
	starbaseSeqId: number,
) =>
	getSagePrograms().pipe(
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
export const getMineItemAddress = (gameId: PublicKey, mint: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [mineItem] = MineItem.findAddress(programs.sage, gameId, mint);

				return mineItem;
			}),
		),
	);

export const getStarbaseAddressByCoordinates = (
	gameId: PublicKey,
	coordinates: [BN, BN],
) =>
	getSagePrograms().pipe(
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
	getSagePrograms().pipe(
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
	getSagePrograms().pipe(
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
