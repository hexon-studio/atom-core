import { Fleet } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { resourceNameToMint } from "../../../constants/resources";
import { getAssociatedTokenAddress } from "../../../utils/getAssociatedTokenAddress";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	getCargoTypeAddress,
	getProfileFactionAddress,
} from "../../utils/pdas";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

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
			console.log("Fleet is already in target sector, skipping...");
			return [];
		}

		const programs = yield* SagePrograms;
		const context = yield* getGameContext();

		const signer = yield* GameService.pipe(
			Effect.flatMap((service) => service.signer),
		);

		const ixs = [];

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Fuel,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const fuelBankAta = yield* getAssociatedTokenAddress(
			resourceNameToMint.Fuel,
			fleetAccount.data.fuelTank,
			true,
		);

		const playerFactionAddress = yield* getProfileFactionAddress(
			fleetAccount.data.ownerProfile,
		);

		const movementHandlerIxs = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...movementHandlerIxs);

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
