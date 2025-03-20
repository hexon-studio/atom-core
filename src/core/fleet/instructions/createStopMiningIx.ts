import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet, PlanetType, StarbasePlayer } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option, Record } from "effect";
import { isNone } from "effect/Option";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { findUserPointsPda } from "~/libs/@staratlas/points";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	fetchStarbaseAccount,
	fetchStarbasePlayerAccount,
	findMineItemPda,
	findResourcePda,
	findSagePlayerProfilePda,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
} from "~/libs/@staratlas/sage";
import { resourceMintByName } from "~/utils";
import {
	FleetNotEnoughFuelError,
	PlanetNotFoundInSectorError,
} from "../../../errors";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createAsteroidMiningHandlerIx } from "./createAsteroidMiningHandlerIx";

export const createStopMiningIx = ({
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
			return yield* Effect.fail(
				new PlanetNotFoundInSectorError({ sector: fleetCoordinates }),
			);
		}

		const planetAddress = maybePlanet.value.key;

		const [starbaseAddress] = yield* findStarbasePdaByCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const starbaseAccount = yield* fetchStarbaseAccount(starbaseAddress);

		const playerProfile = context.playerProfile.key;

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

		const starbasePlayerAccount = yield* fetchStarbasePlayerAccount(
			starbasePlayerAddress,
		).pipe(Effect.option);

		const ixs: InstructionReturn[] = [];

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

		const [mineItemKey] = yield* findMineItemPda(
			fleetAccount.data.gameId,
			resourceMint,
		);

		const [resourceKey] = yield* findResourcePda({
			mint: mineItemKey,
			planet: planetAddress,
		});

		const fleetKey = fleetAccount.key;

		const fuelTankInfo = yield* getFleetCargoPodInfoByType({
			type: "fuel_tank",
			fleetAccount,
		});

		const maybeFuelInTankData = Record.get(
			fuelTankInfo.resources,
			resourceMintByName("Fuel").toString(),
		);

		if (Option.isNone(maybeFuelInTankData)) {
			return yield* Effect.fail(
				new FleetNotEnoughFuelError({
					action: "stop-mining",
					requiredFuel: "0",
					availableFuel: "0",
				}),
			);
		}

		const fuelInTankData = maybeFuelInTankData.value;

		const miningHandlerIxs = yield* createAsteroidMiningHandlerIx({
			fleetAccount,
			resourceMint,
			planetAddress,
		});

		ixs.push(...miningHandlerIxs);

		const [miningXpKey] = yield* findUserPointsPda({
			category: "miningXp",
			playerProfile: context.playerProfile.key,
		});

		const [pilotXpKey] = yield* findUserPointsPda({
			category: "pilotXp",
			playerProfile: context.playerProfile.key,
		});

		const [councilRankXpKey] = yield* findUserPointsPda({
			category: "councilRankXp",
			playerProfile: context.playerProfile.key,
		});

		yield* Effect.log("Creating stopMiningAsteroid IX");

		const stopMiningAsteroidIx = Fleet.stopMiningAsteroid(
			programs.sage,
			programs.cargo,
			programs.points,
			signer,
			playerProfile,
			playerFactionAddress,
			fleetKey,
			mineItemKey,
			resourceKey,
			planetAddress,
			fleetAccount.data.fuelTank,
			fuelInTankData.cargoTypeAccount.key,
			context.gameInfo.cargoStatsDefinitionId,
			miningXpKey,
			context.gameInfo.points.miningXpCategory.category,
			context.gameInfo.points.miningXpCategory.modifier,
			pilotXpKey,
			context.gameInfo.points.pilotXpCategory.category,
			context.gameInfo.points.pilotXpCategory.modifier,
			councilRankXpKey,
			context.gameInfo.points.councilRankXpCategory.category,
			context.gameInfo.points.councilRankXpCategory.modifier,
			context.gameInfo.gameStateId,
			context.gameInfo.gameId,
			fuelInTankData.tokenAccountKey,
			resourceMintByName("Fuel"),
			{ keyIndex: context.keyIndexes.sage },
		);

		ixs.push(stopMiningAsteroidIx);

		return ixs;
	});
