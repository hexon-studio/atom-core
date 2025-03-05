import type { PublicKey } from "@solana/web3.js";
import { stringToByteArray } from "@staratlas/data-source";
import {
	Fleet,
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
import { getGameContext } from "~/core/services/GameService/utils";
import { FindPdaError } from "~/errors";

export const findFleetPdaByName = (fleetName: string) =>
	Effect.all([getSagePrograms(), getGameContext()]).pipe(
		Effect.flatMap(([programs, context]) =>
			Effect.try({
				try: () => {
					const fleetLabel = stringToByteArray(fleetName, 32);

					return Fleet.findAddress(
						programs.sage,
						context.gameInfo.gameId,
						context.playerProfile.key,
						fleetLabel,
					);
				},
				catch: (error) => new FindPdaError({ error }),
			}),
		),
	);

export const findSagePlayerProfilePda = (
	gameId: PublicKey,
	playerProfile: PublicKey,
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() =>
				SagePlayerProfile.findAddress(programs.sage, playerProfile, gameId),
			),
		),
	);

export const findStarbasePlayerPda = (
	starbase: PublicKey,
	sagePlayerProfile: PublicKey,
	starbaseSeqId: number,
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() =>
				StarbasePlayer.findAddress(
					programs.sage,
					starbase,
					sagePlayerProfile,
					starbaseSeqId,
				),
			),
		),
	);
export const findMineItemPda = (gameId: PublicKey, mint: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => MineItem.findAddress(programs.sage, gameId, mint)),
		),
	);

export const findStarbasePdaByCoordinates = (
	gameId: PublicKey,
	coordinates: [BN, BN],
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() =>
				Starbase.findAddress(programs.sage, gameId, coordinates),
			),
		),
	);

export const findResourcePda = ({
	mint,
	planet,
}: { mint: PublicKey; planet: PublicKey }) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => Resource.findAddress(programs.sage, mint, planet)),
		),
	);

export const findSectorPdaByCoordinates = (coordinates: [BN, BN]) =>
	Effect.all([getSagePrograms(), getGameContext()]).pipe(
		Effect.flatMap(([programs, context]) =>
			Effect.try(() =>
				Sector.findAddress(programs.sage, context.gameInfo.gameId, coordinates),
			),
		),
	);
