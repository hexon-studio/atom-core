import { Fleet, calculateDistance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { FleetNotEnoughFuelError } from "../errors";
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

		const fuelTankInfo = yield* getFleetCargoPodInfoByType({
			fleetAccount,
			type: "fuel_tank",
		});

		const requiredFuel =
			Math.ceil(
				Fleet.calculateSubwarpFuelBurnWithDistance(
					fleetAccount.data.stats,
					targetSectorDistance,
				),
			) + 1;

		if (fuelTankInfo.totalResourcesAmountInCargoUnits.lten(requiredFuel)) {
			return yield* new FleetNotEnoughFuelError();
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
