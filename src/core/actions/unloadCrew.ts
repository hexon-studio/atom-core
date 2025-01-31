import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { GameService } from "../services/GameService";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import { createUnloadCrewIx } from "../fleet/instructions/createUnloadCrewIx";
import type { ShipStats } from "@staratlas/sage";
import type { InstructionReturn } from "@staratlas/data-source";

export const unloadCrew = ({
	fleetNameOrAddress,
	crewAmount,
	allowUnloadRequiredCrew = false,
}: {
	fleetNameOrAddress: string | PublicKey;
	crewAmount: number;
	allowUnloadRequiredCrew: boolean;
}) =>
	Effect.gen(function* () {
		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		yield* Effect.log(
			`Unloading crew from fleet ${fleetAccount.key.toString()}`,
		);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			startbaseCoords: fleetCoords,
		});

		let finalCrewAmount = crewAmount;

		// check if there are enough crew members in the fleet
		const fleetMiscStats = (<ShipStats>fleetAccount.data.stats).miscStats;
		const currentCrew = fleetMiscStats.crewCount;
		const requiredCrew = fleetMiscStats.requiredCrew;

		if (
			!allowUnloadRequiredCrew &&
			finalCrewAmount > currentCrew - requiredCrew
		) {
			finalCrewAmount = currentCrew - requiredCrew;
		}

		if (allowUnloadRequiredCrew && finalCrewAmount > currentCrew) {
			finalCrewAmount = currentCrew;
		}

		if (finalCrewAmount === 0) {
			yield* Effect.log("No passenger crew to unload in fleet. Skipping.");
			return [];
		}

		const ixs: InstructionReturn[] = [];

		yield* Effect.log(
			`Unloading ${finalCrewAmount} passenger crew from fleet ${fleetAccount.key.toString()}`,
		);

		const unloadCrewIxs = yield* createUnloadCrewIx({
			fleetAccount,
			starbaseInfo,
			crewAmount: finalCrewAmount,
		});

		ixs.push(...unloadCrewIxs);

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			size: 1,
		});

		const txIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Crew started unloading");

		return txIds;
	});
