import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import type { MiscStats } from "@staratlas/sage";
import { BN } from "bn.js";
import { Effect } from "effect";
import {
	getFleetAccountByNameOrAddress,
	getStarbasePlayerAccount,
} from "~/libs/@staratlas/sage";
import { createLoadCrewIx } from "../fleet/instructions/createLoadCrewIx";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { getCurrentFleetSectorCoordinates } from "../fleet/utils/getCurrentFleetSectorCoordinates";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { getStarbaseInfoByCoords } from "../utils/getStarbaseInfo";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const loadCrew = ({
	fleetNameOrAddress,
	crewAmount,
}: {
	fleetNameOrAddress: string | PublicKey;
	crewAmount: number;
}) =>
	Effect.gen(function* () {
		yield* Effect.log("Start loading crew...");

		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		yield* Effect.log(`Loading crew to fleet ${fleetAccount.key.toString()}`);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			starbaseCoords: fleetCoords,
		});

		const starbasePlayerAccount = yield* getStarbasePlayerAccount(
			starbaseInfo.starbasePlayerPubkey,
		);

		const starbaseTotalCrewCount = new BN(starbasePlayerAccount.totalCrew());

		const starbaseBusyCrewCount = starbasePlayerAccount.data.busyCrew;

		const starbaseAvailableCrewCount = starbaseTotalCrewCount
			.sub(starbaseBusyCrewCount)
			.toNumber();

		if (starbaseAvailableCrewCount <= 0) {
			yield* Effect.log("In starbase there are no crew to load. Skipping.");

			return { signatures: [] };
		}

		const fleetMiscStats = fleetAccount.data.stats.miscStats as MiscStats;
		const currentCrew = fleetMiscStats.crewCount;

		const totalCrewCapacity =
			fleetMiscStats.requiredCrew + fleetMiscStats.passengerCapacity;

		const finalCrewAmount = Math.min(
			Math.min(crewAmount, starbaseAvailableCrewCount),
			totalCrewCapacity - currentCrew,
		);

		if (finalCrewAmount <= 0) {
			yield* Effect.log("Fleet is at maximum crew capacity. Skipping.");
			return { signatures: [] };
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* createPreIxs({
			fleetAccount,
			targetState: "StarbaseLoadingBay",
		});

		ixs.push(...preIxs);

		yield* Effect.log(
			`Loading ${finalCrewAmount} passenger crew to fleet ${fleetAccount.key.toString()}`,
		);

		const loadCrewIxs = yield* createLoadCrewIx({
			fleetAccount,
			starbaseInfo,
			crewAmount: finalCrewAmount,
		});

		ixs.push(...loadCrewIxs);

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			afterIxs: drainVaultIx,
			ixs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Crew loaded successfully");

		return { signatures };
	});
