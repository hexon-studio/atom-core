import { Fleet, type ShipStats, calculateDistance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import {
	findCargoTypePda,
	getFleetCargoPodInfoByType,
} from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { resourceNameToMint } from "../../../constants/resources";
import { findAssociatedTokenPda } from "../../../utils/getAssociatedTokenAddress";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { FleetNotEnoughFuelError, SectorTooFarError } from "../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

type Param = {
	fleetAccount: Fleet;
	targetSector: [BN, BN];
};

export const createWarpToCoordinateIx = ({
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

		const fleetStats = fleetAccount.data.stats as ShipStats;

		const targetSectorDistance = calculateDistance(currentSector, targetSector);

		const maxWarpDistance = fleetStats.movementStats.maxWarpDistance / 100;

		if (targetSectorDistance > maxWarpDistance) {
			return yield* new SectorTooFarError();
		}

		const requiredFuel =
			Math.ceil(
				Fleet.calculateWarpFuelBurnWithDistance(
					fleetStats,
					targetSectorDistance,
				),
			) + 1;

		yield* Effect.log("Fuel needed to warp", requiredFuel.toString());

		const fuelTankInfo = yield* getFleetCargoPodInfoByType({
			fleetAccount,
			type: "fuel_tank",
		});

		if (fuelTankInfo.totalResourcesAmountInCargoUnits.lten(requiredFuel)) {
			return yield* new FleetNotEnoughFuelError();
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

		const fuelBankAta = yield* findAssociatedTokenPda(
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
