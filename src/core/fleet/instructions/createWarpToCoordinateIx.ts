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
			context.cargoStatsDefinition,
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
			context.cargoStatsDefinition.key,
			fuelBankAta,
			resourceNameToMint.Fuel,
			context.game.data.gameState,
			context.game.key,
			programs.cargo,
			{ keyIndex: 1, toSector: [targetSectorX, targetSectorY] }, // 0 - normal wallet, 1 - hot wallet
		);

		return [...ixs, warpIx];
	});
