import type { PublicKey } from "@solana/web3.js";
import {
	Fleet,
	type MovementStats,
	PlanetType,
	StarbasePlayer,
} from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option, Record } from "effect";
import { isNone } from "effect/Option";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	findMineItemPda,
	findResourcePda,
	findSagePlayerProfilePda,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
	getMineItemAccount,
	getResourceAccount,
	getStarbaseAccount,
	getStarbasePlayerAccount,
} from "~/libs/@staratlas/sage";
import { resourceNameToMint } from "../../../constants/resources";
import {
	FleetNotEnoughFuelError,
	PlanetNotFoundInSectorError,
} from "../../../errors";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

export const createStartMiningIx = ({
	fleetAccount,
	resourceMint,
}: {
	fleetAccount: Fleet;
	resourceMint: PublicKey;
}) =>
	Effect.gen(function* () {
		const signer = yield* GameService.signer;

		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		const gameId = context.gameInfo.gameId;
		const gameState = context.gameInfo.gameStateId;

		const fleetCoordinates = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const maybePlanet = yield* GameService.findPlanets().pipe(
			Effect.flatMap(
				Effect.findFirst((planet) => {
					const [fleetX, fleetY] = fleetCoordinates;
					const [planetX, planetY] = planet.data.sector as [BN, BN];

					return Effect.succeed(
						planet.data.planetType === PlanetType.AsteroidBelt &&
							fleetX.eq(planetX) &&
							fleetY.eq(planetY),
					);
				}),
			),
		);

		if (isNone(maybePlanet)) {
			return yield* new PlanetNotFoundInSectorError({
				sector: fleetCoordinates,
			});
		}

		const planetPubkey = maybePlanet.value.key;

		const [starbaseAddress] = yield* findStarbasePdaByCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		const playerProfile = fleetAccount.data.ownerProfile;

		const [playerFactionAddress] = yield* findProfileFactionPda(playerProfile);

		const [sagePlayerProfileAddress] = yield* findSagePlayerProfilePda(
			fleetAccount.data.gameId,
			playerProfile,
		);

		const [starbasePlayerAddress] = yield* findStarbasePlayerPda(
			starbaseAccount.key,
			sagePlayerProfileAddress,
			starbaseAccount.data.seqId,
		);

		const starbasePlayerAccount = yield* getStarbasePlayerAccount(
			starbasePlayerAddress,
		).pipe(Effect.option);

		const ixs = [];

		if (isNone(starbasePlayerAccount)) {
			const ix_0 = StarbasePlayer.registerStarbasePlayer(
				programs.sage,
				playerFactionAddress,
				sagePlayerProfileAddress,
				starbaseAddress,
				gameId,
				gameState,
				starbaseAccount.data.seqId,
			);

			ixs.push(ix_0);
		}

		const maybeMoveHandlerIx = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...maybeMoveHandlerIx);

		const [mineItemKey] = yield* findMineItemPda(
			fleetAccount.data.gameId,
			resourceMint,
		);

		yield* Effect.log("MineItem PDA").pipe(
			Effect.annotateLogs({
				gameId: fleetAccount.data.gameId.toString(),
				resourceMint: resourceMint.toString(),
				mineItemKey: mineItemKey.toString(),
			}),
		);

		yield* getMineItemAccount(mineItemKey);

		const [resourceKey] = yield* findResourcePda({
			mint: mineItemKey,
			planet: planetPubkey,
		});

		yield* Effect.log("Resource PDA").pipe(
			Effect.annotateLogs({
				mineItemKey: mineItemKey.toString(),
				planet: planetPubkey.toString(),
				resourceKey: resourceKey.toString(),
			}),
		);

		yield* getResourceAccount(resourceKey);

		const fleetKey = fleetAccount.key;

		const requiredFuelAmount = (
			fleetAccount.data.stats.movementStats as MovementStats
		).planetExitFuelAmount;

		const fuelCargoPodInfo = yield* getFleetCargoPodInfoByType({
			type: "fuel_tank",
			fleetAccount,
		});

		const maybeFuelInTankData = Record.get(
			fuelCargoPodInfo.resources,
			resourceNameToMint.Fuel.toString(),
		);

		if (Option.isNone(maybeFuelInTankData)) {
			return yield* new FleetNotEnoughFuelError({
				action: "start-mining",
				requiredFuel: requiredFuelAmount.toString(),
				availableFuel: "0",
			});
		}

		const fuelInTankData = maybeFuelInTankData.value;

		if (fuelInTankData.amountInCargoUnits.ltn(requiredFuelAmount)) {
			return yield* new FleetNotEnoughFuelError({
				action: "start-mining",
				requiredFuel: requiredFuelAmount.toString(),
				availableFuel: fuelInTankData.amountInCargoUnits.toString(),
			});
		}

		const miningIx = Fleet.startMiningAsteroid(
			programs.sage,
			signer,
			playerProfile,
			playerFactionAddress,
			fleetKey,
			starbaseAddress,
			starbasePlayerAddress,
			mineItemKey,
			resourceKey,
			planetPubkey,
			context.gameInfo.gameStateId,
			context.gameInfo.gameId,
			fuelInTankData.tokenAccountKey,
			{ keyIndex: context.keyIndexes.sage },
		);

		return [...ixs, miningIx];
	});
