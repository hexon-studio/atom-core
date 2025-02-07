import { calculateDistance, Fleet, type ShipStats } from "@staratlas/sage";
import BN from "bn.js";
import { Effect } from "effect";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { FleetNotEnoughFuelToSubwarpError } from "../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";
import { getFleetCargoPodInfosForItems } from "../utils/getFleetCargoPodInfosForItems";

type Param = {
	fleetAccount: Fleet;
	targetSector: [BN, BN];
};

export const createSubwarpToCoordinateIx = ({
	fleetAccount,
	targetSector: [targetSectorX, targetSectorY],
}: Param) =>
	Effect.gen(function* () {
		const [actualFleetSectorX, actualFleetSectorY] =
			yield* getCurrentFleetSectorCoordinates(fleetAccount.state);

		if (
			actualFleetSectorX.eq(targetSectorX) &&
			actualFleetSectorY.eq(targetSectorY)
		) {
			return [];
		}

		const fleetStats = fleetAccount.data.stats as ShipStats;

		const distance = calculateDistance(
			[actualFleetSectorX, actualFleetSectorY],
			[targetSectorX, targetSectorY],
		);

		const fuelNeededToSubwarp = new BN(
			Fleet.calculateSubwarpFuelBurnWithDistance(fleetStats, distance) + 1,
		);

		const cargoPodInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: ["fuel_tank"],
			fleetAccount,
		});

		if (
			fuelNeededToSubwarp.gt(
				cargoPodInfos.fuel_tank?.totalResourcesAmountInCargoUnits ?? new BN(0),
			)
		) {
			return yield* Effect.fail(new FleetNotEnoughFuelToSubwarpError());
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
			context.gameInfo.game.key,
			context.gameInfo.game.data.gameState,
			{
				keyIndex: context.keyIndexes.sage,
				toSector: [targetSectorX, targetSectorY],
			},
		);

		return [...ixs, subwarpIx];
	});
