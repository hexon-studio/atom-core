import { Fleet, calculateDistance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option, Record } from "effect";
import { resourceNameToMint } from "~/constants/resources";
import { FleetNotEnoughFuelError } from "~/errors";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

type Param = {
	fleetAccount: Fleet;
	targetSector: [BN, BN];
};

export const createSubwarpToCoordinateIx = ({
	fleetAccount,
	targetSector,
}: Param) =>
	Effect.gen(function* () {
		const [targetSectorX, targetSectorY] = targetSector;

		const currentSector = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const [currentSectorX, currentSectorY] = currentSector;

		if (currentSectorX.eq(targetSectorX) && currentSectorY.eq(targetSectorY)) {
			return [];
		}

		const targetSectorDistance = calculateDistance(currentSector, targetSector);

		const requiredFuel =
			Math.ceil(
				Fleet.calculateSubwarpFuelBurnWithDistance(
					fleetAccount.data.stats,
					targetSectorDistance,
				),
			) + 1;

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
				action: "subwarp",
				requiredFuel: requiredFuel.toString(),
				availableFuel: "0",
			});
		}

		const fuelInTankData = maybeFuelInTankData.value;

		if (fuelInTankData.amountInCargoUnits.ltn(requiredFuel)) {
			return yield* new FleetNotEnoughFuelError({
				action: "subwarp",
				requiredFuel: requiredFuel.toString(),
				availableFuel: fuelInTankData.amountInCargoUnits.toString(),
			});
		}

		const programs = yield* getSagePrograms();
		const context = yield* getGameContext();

		const signer = yield* GameService.pipe(
			Effect.flatMap((service) => service.signer),
		);

		const ixs = [];

		const [playerFactionAddress] = yield* findProfileFactionPda(
			fleetAccount.data.ownerProfile,
		);

		const movementHandlerIxs = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...movementHandlerIxs);

		yield* Effect.log("Creating startSubwarp IX").pipe(
			Effect.annotateLogs({
				fleetAddress: fleetAccount.key.toString(),
				keyIndex: context.keyIndexes.sage,
				toSector: [targetSectorX, targetSectorY].toString(),
			}),
		);

		const subwarpIx = Fleet.startSubwarp(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			context.gameInfo.gameId,
			context.gameInfo.gameStateId,
			{
				keyIndex: context.keyIndexes.sage,
				toSector: [targetSectorX, targetSectorY],
			},
		);

		return [...ixs, subwarpIx];
	});
