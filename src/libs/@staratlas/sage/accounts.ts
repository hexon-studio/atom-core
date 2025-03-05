import type { PublicKey } from "@solana/web3.js";
import { byteArrayToString } from "@staratlas/data-source";
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
import { Effect, Array as EffectArray, Option, identity } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";
import type { ReadFromRPCError } from "~/errors";
import { AccountError } from "~/errors/account";
import { readFromSage } from "~/libs/@staratlas/data-source";
import { isPublicKey } from "~/utils/public-key";
import { readAllFromSage } from "../data-source/readAllFromSage";
import { findFleetPdaByName } from "./pdas";

export const getGameAccount = (gamePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gamePublicKey, Game),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new AccountError({
					error: error.error,
					keyOrName: gamePublicKey.toString(),
					reason: "Failed to get game account",
				}),
			),
		),
	);

export const getGameStateAccount = (gameStatePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, gameStatePublicKey, GameState),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new AccountError({
					error: error.error,
					keyOrName: gameStatePublicKey.toString(),
					reason: "Failed to get game state account",
				}),
			),
		),
	);

export const getFleetAccountsByPlayerProfile = () =>
	Effect.all([getGameContext(), getSagePrograms()]).pipe(
		Effect.flatMap(([context, programs]) =>
			readAllFromSage(programs.sage, Fleet, "confirmed", [
				{
					memcmp: {
						offset: 105,
						bytes: context.playerProfile.key.toString(),
					},
				},
			]),
		),
		Effect.map(
			EffectArray.filterMap((account) =>
				account.type === "ok" ? Option.some(account.data) : Option.none(),
			),
		),
	);

export const getFleetAccountByNameOrAddress = (
	fleetNameOrAddress: string | PublicKey,
) =>
	Effect.gen(function* () {
		if (isPublicKey(fleetNameOrAddress)) {
			return yield* getFleetAccount(fleetNameOrAddress);
		}

		const [fleetPda] = yield* findFleetPdaByName(fleetNameOrAddress);

		return yield* getFleetAccount(fleetPda).pipe(
			Effect.orElse(() =>
				getFleetAccountsByPlayerProfile().pipe(
					Effect.map(
						EffectArray.filter(
							(fleet) =>
								byteArrayToString(fleet.data.fleetLabel) === fleetNameOrAddress,
						),
					),
					Effect.map(EffectArray.head),
					Effect.flatMap(identity),
				),
			),
		);
	});

export const getFleetAccount = (fleetPubkey: PublicKey) =>
	getSagePrograms()
		.pipe(
			Effect.flatMap((programs) =>
				readFromSage(programs.sage, fleetPubkey, Fleet),
			),
			Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
				Effect.fail(
					new AccountError({
						error: error.error,
						keyOrName: fleetPubkey.toString(),
						reason: "Failed to get fleet account",
					}),
				),
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
				new AccountError({
					error: error.error,
					keyOrName: mineItemPubkey.toString(),
					reason: "Failed to get mine item account",
				}),
			),
		),
	);

export const getPlanetAccount = (planetPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, planetPubkey, Planet),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new AccountError({
					error: error.error,
					keyOrName: planetPubkey.toString(),
					reason: "Failed to get planet account",
				}),
			),
		),
	);

export const getResourceAccount = (resourcePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, resourcePubkey, Resource),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new AccountError({
					error: error.error,
					keyOrName: resourcePubkey.toString(),
					reason: "Failed to get resource account",
				}),
			),
		),
	);

export const getSectorAccount = (sectorPubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, sectorPubkey, Sector),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new AccountError({
					error: error.error,
					keyOrName: sectorPubkey.toString(),
					reason: "Failed to get sector account",
				}),
			),
		),
	);

export const getStarbaseAccount = (starbasePubkey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.sage, starbasePubkey, Starbase),
		),
		Effect.catchTag("ReadFromRPCError", (error: ReadFromRPCError) =>
			Effect.fail(
				new AccountError({
					error: error.error,
					keyOrName: starbasePubkey.toString(),
					reason: "Failed to get starbase account",
				}),
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
				new AccountError({
					error: error.error,
					keyOrName: starbasePlayerPubkey.toString(),
					reason: "Failed to get starbase player account",
				}),
			),
		),
	);
