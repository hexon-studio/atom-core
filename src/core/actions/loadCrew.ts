import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import {
	getFleetAccountByNameOrAddress,
	getStarbasePlayerAccount,
} from "~/libs/@staratlas/sage";
import { GameService } from "../services/GameService";
import { createLoadCrewIx } from "../fleet/instructions/createLoadCrewIx";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import type { ShipStats } from "@staratlas/sage";

export const loadCrew = ({
	fleetNameOrAddress,
	crewAmount,
}: {
	fleetNameOrAddress: string | PublicKey;
	crewAmount: number;
}) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		yield* Effect.log(`Loading crew to fleet ${fleetAccount.key.toString()}`);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			startbaseCoords: fleetCoords,
		});

		// check if there are enough crew members in the starbase
		const starbasePlayerAccount = yield* getStarbasePlayerAccount(
			starbaseInfo.starbasePlayerPubkey,
		);

		const starbaseCrewCount = starbasePlayerAccount.totalCrew();

		if (starbaseCrewCount === 0) {
			yield* Effect.log("No passenger crew to load in starbase. Skipping.");
			return [];
		}

		let finalCrewAmount = crewAmount;

		if (starbaseCrewCount < crewAmount) {
			finalCrewAmount = starbaseCrewCount;
		}

		// check if there is enough passenger space in the fleet
		const fleetMiscStats = (<ShipStats>fleetAccount.data.stats).miscStats;
		const currentCrew = fleetMiscStats.crewCount;
		const totalCrewCapacity =
			fleetMiscStats.requiredCrew + fleetMiscStats.passengerCapacity;

		if (currentCrew + finalCrewAmount > totalCrewCapacity) {
			finalCrewAmount = totalCrewCapacity - currentCrew;
		}

		if (finalCrewAmount === 0) {
			yield* Effect.log("Not enough passenger space in fleet. Skipping.");
			return [];
		}

		const ixs: InstructionReturn[] = [];

		yield* Effect.log(
			`Loading ${finalCrewAmount} passenger crew to fleet ${fleetAccount.key.toString()}`,
		);

		const loadCrewIxs = yield* createLoadCrewIx({
			fleetAccount,
			starbaseInfo,
			crewAmount: finalCrewAmount,
		});

		ixs.push(...loadCrewIxs);

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			size: 1,
		});

		const txIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Crew started loading");

		return txIds;
	});
