import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import type { MiscStats } from "@staratlas/sage";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { createUnloadCrewIx } from "../fleet/instructions/createUnloadCrewIx";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

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
		yield* Effect.log("Start unloading crew...");

		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			starbaseCoords: fleetCoords,
		});

		const fleetMiscStats = fleetAccount.data.stats.miscStats as MiscStats;
		const currentCrew = fleetMiscStats.crewCount;

		const requiredCrew = allowUnloadRequiredCrew
			? 0
			: fleetMiscStats.requiredCrew;

		const finalCrewAmount = Math.min(crewAmount, currentCrew - requiredCrew);

		if (finalCrewAmount <= 0) {
			yield* Effect.log("In fleet there are no crew to disembark. Skipping.");

			return { signatures: [] };
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* createPreIxs({
			fleetAccount,
			targetState: "StarbaseLoadingBay",
		});

		ixs.push(...preIxs);

		yield* Effect.log(
			`Unloading ${finalCrewAmount} passenger crew from fleet ${fleetAccount.key.toString()}`,
		);

		const unloadCrewIxs = yield* createUnloadCrewIx({
			fleetAccount,
			starbaseInfo,
			crewAmount: finalCrewAmount,
		});

		ixs.push(...unloadCrewIxs);

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* GameService.sendAllTransactions(txs);

		yield* Effect.log("Crew unloaded successfully");

		return { signatures };
	});
