import { Fleet } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getProfileFactionAddress } from "../../utils/pdas";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

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
			console.log("Fleet is already in target sector, skipping...");
			return [];
		}

		const programs = yield* SagePrograms;
		const context = yield* getGameContext();

		const signer = yield* GameService.pipe(
			Effect.flatMap((service) => service.signer),
		);

		const ixs = [];

		const playerFactionAddress = yield* getProfileFactionAddress(
			fleetAccount.data.ownerProfile,
		);

		const movementHandlerIxs = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...movementHandlerIxs);

		const subwarpIx = Fleet.startSubwarp(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			context.game.key,
			context.gameState.key,
			{ keyIndex: 1, toSector: [targetSectorX, targetSectorY] }, // 0 - normal wallet, 1 - hot wallet
		);

		return [...ixs, subwarpIx];
	});
