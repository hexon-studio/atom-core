import { calculateDistance, Fleet, type ShipStats } from "@staratlas/sage";
import BN from "bn.js";
import { Effect } from "effect";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { resourceNameToMint } from "../../../constants/resources";
import { getAssociatedTokenAddress } from "../../../utils/getAssociatedTokenAddress";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	FleetNotEnoughFuelToWarpError,
	FleetWarpRangeExceededError,
} from "../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";
import { getFleetCargoPodInfosForItems } from "../utils/getFleetCargoPodInfosForItems";

type Param = {
	fleetAccount: Fleet;
	targetSector: [BN, BN];
};

export const createWarpToCoordinateIx = ({
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

		const maxWarpDistance = fleetStats.movementStats.maxWarpDistance / 100;

		if (distance > maxWarpDistance) {
			return yield* Effect.fail(new FleetWarpRangeExceededError());
		}

		const fuelNeededToWarp = new BN(
			Fleet.calculateWarpFuelBurnWithDistance(fleetStats, distance) + 1,
		);

		yield* Effect.log("Fuel needed to warp", fuelNeededToWarp.toString());
		const cargoPodInfos = yield* getFleetCargoPodInfosForItems({
			cargoPodKinds: ["fuel_tank"],
			fleetAccount,
		});

		if (
			fuelNeededToWarp.gt(
				cargoPodInfos.fuel_tank?.totalResourcesAmountInCargoUnits ?? new BN(0),
			)
		) {
			return yield* Effect.fail(new FleetNotEnoughFuelToWarpError());
		}

		const programs = yield* getSagePrograms();
		const context = yield* getGameContext();

		const signer = yield* GameService.pipe(
			Effect.flatMap((service) => service.signer),
		);

		const ixs = [];

		const [cargoTypeAddress] = yield* findCargoTypePda(
			resourceNameToMint.Fuel,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const fuelBankAta = yield* getAssociatedTokenAddress(
			resourceNameToMint.Fuel,
			fleetAccount.data.fuelTank,
			true,
		);

		const [playerFactionAddress] = yield* findProfileFactionPda(
			fleetAccount.data.ownerProfile,
		);

		const movementHandlerIxs = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...movementHandlerIxs);

		yield* Effect.log("Creating warpToCoordinate IX").pipe(
			Effect.annotateLogs({
				fleetAddress: fleetAccount.key.toString(),
				keyIndex: context.keyIndexes.sage,
				toSector: [targetSectorX, targetSectorY].toString(),
			}),
		);

		const warpIx = Fleet.warpToCoordinate(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			fleetAccount.data.fuelTank,
			cargoTypeAddress,
			context.gameInfo.cargoStatsDefinition.key,
			fuelBankAta,
			resourceNameToMint.Fuel,
			context.gameInfo.game.data.gameState,
			context.gameInfo.game.key,
			programs.cargo,
			{
				keyIndex: context.keyIndexes.sage,
				toSector: [targetSectorX, targetSectorY],
			},
		);

		return [...ixs, warpIx];
	});
