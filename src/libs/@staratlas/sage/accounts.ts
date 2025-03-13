import type { PublicKey } from "@solana/web3.js";
import { byteArrayToString } from "@staratlas/data-source";
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
import { Effect, Array as EffectArray, Option, identity } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";
import type { ReadFromRPCError } from "~/errors";
import { AccountError } from "~/errors/account";
import { readFromSage } from "~/libs/@staratlas/data-source";
import { isPublicKey } from "~/utils/public-key";
import { readAllFromSage } from "../data-source/readAllFromSage";
import { findFleetPdaByName } from "./pdas";

export const fetchGameAccount = (gamePublicKey: PublicKey) =>
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

export const fetchFleetAccountsByPlayerProfile = () =>
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

export const fetchFleetAccountByNameOrAddress = (
	fleetNameOrAddress: string | PublicKey,
) =>
	Effect.gen(function* () {
		if (isPublicKey(fleetNameOrAddress)) {
			return yield* fetchFleetAccount(fleetNameOrAddress);
		}

		const [fleetPda] = yield* findFleetPdaByName(fleetNameOrAddress);

		return yield* fetchFleetAccount(fleetPda).pipe(
			Effect.orElse(() =>
				fetchFleetAccountsByPlayerProfile().pipe(
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

export const fetchFleetAccount = (fleetPubkey: PublicKey) =>
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

export const fetchMineItemAccount = (mineItemPubkey: PublicKey) =>
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

export const fetchPlanetAccount = (planetPubkey: PublicKey) =>
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

export const fetchResourceAccount = (resourcePubkey: PublicKey) =>
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

export const fetchSectorAccount = (sectorPubkey: PublicKey) =>
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

export const fetchStarbaseAccount = (starbasePubkey: PublicKey) =>
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

export const fetchStarbasePlayerAccount = (starbasePlayerPubkey: PublicKey) =>
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
