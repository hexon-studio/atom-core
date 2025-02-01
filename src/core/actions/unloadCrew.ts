import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import type { MiscStats } from "@staratlas/sage";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createUnloadCrewIx } from "../fleet/instructions/createUnloadCrewIx";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import { GameService } from "../services/GameService";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";

export const unloadCrew = ({
	allowUnloadRequiredCrew = false,
	crewAmount,
	fleetNameOrAddress,
}: {
	allowUnloadRequiredCrew: boolean;
	crewAmount: number;
	fleetNameOrAddress: string | PublicKey;
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

		// check if there are enough crew members in the fleet
		const fleetMiscStats = fleetAccount.data.stats.miscStats as MiscStats;
		const currentCrew = fleetMiscStats.crewCount;

		const requiredCrew = allowUnloadRequiredCrew
			? 0
			: fleetMiscStats.requiredCrew;

		const finalCrewAmount = Math.min(crewAmount, currentCrew - requiredCrew);

		if (finalCrewAmount <= 0) {
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
