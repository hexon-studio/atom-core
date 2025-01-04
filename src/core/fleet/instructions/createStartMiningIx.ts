import type { PublicKey } from "@solana/web3.js";
import { Fleet, PlanetType, StarbasePlayer } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option, Record } from "effect";
import { isNone } from "effect/Option";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { getProfileFactionAddress } from "~/libs/@staratlas/profile-faction";
import {
	getMineItemAddress,
	getResourceAddress,
	getSagePlayerProfileAddress,
	getStarbaseAccount,
	getStarbaseAddressByCoordinates,
	getStarbasePlayerAccount,
	getStarbasePlayerAddress,
} from "~/libs/@staratlas/sage";
import { resourceNameToMint } from "../../../constants/resources";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	FleetNotEnoughFuelError,
	PlanetNotFoundInSectorError,
} from "../errors";
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

		const gameId = context.gameInfo.game.key;
		const gameState = context.gameInfo.game.data.gameState;

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

		const planetPubkey = maybePlanet.value.key;

		const starbaseAddress = yield* getStarbaseAddressByCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		const playerProfile = fleetAccount.data.ownerProfile;

		const playerFactionAddress = yield* getProfileFactionAddress(playerProfile);

		const sagePlayerProfileAddress = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			playerProfile,
		);

		const starbasePlayerAddress = yield* getStarbasePlayerAddress(
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

		const mineItemKey = yield* getMineItemAddress(
			fleetAccount.data.gameId,
			resourceMint,
		);

		const resourceKey = yield* getResourceAddress(mineItemKey, planetPubkey);

		const fleetKey = fleetAccount.key;

		const fuelCargoPodInfo = yield* getFleetCargoPodInfoByType({
			type: "fuel_tank",
			fleetAccount,
		});

		const maybeFuelInTankData = Record.get(
			fuelCargoPodInfo.resources,
			resourceNameToMint.Fuel.toString(),
		);

		if (Option.isNone(maybeFuelInTankData)) {
			return yield* Effect.fail(new FleetNotEnoughFuelError());
		}

		const fuelInTankData = maybeFuelInTankData.value;

		yield* Effect.log("Creating startMiningAsteroid IX");

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
			context.gameInfo.game.data.gameState,
			context.gameInfo.game.key,
			fuelInTankData.tokenAccountKey,
			{ keyIndex: context.keyIndexes.sage },
		);

		return [...ixs, miningIx];
	});
