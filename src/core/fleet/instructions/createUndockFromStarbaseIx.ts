import { Fleet, type MiscStats } from "@staratlas/sage";
import { Effect } from "effect";
import { getFleetStateName } from "~/core/utils/getFleetStateName";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	findSagePlayerProfilePda,
	findStarbasePlayerPda,
	getStarbaseAccount,
} from "~/libs/@staratlas/sage";
import {
	FleetCrewNotNormalizedError,
	InvalidFleetStateError,
} from "../../../errors";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

export const createUndockFromStarbaseIx = (fleetAccount: Fleet) =>
	Effect.gen(function* () {
		if (!fleetAccount.state.StarbaseLoadingBay) {
			return yield* Effect.fail(
				new InvalidFleetStateError({
					state: getFleetStateName(fleetAccount.state),
					reason: "Fleet is already undocked",
				}),
			);
		}

		const fleetMiscStats = fleetAccount.data.stats.miscStats as MiscStats;

		if (!fleetAccount.normalizedCrew()) {
			return yield* Effect.fail(
				new FleetCrewNotNormalizedError({
					crewCount: fleetMiscStats.crewCount.toString(),
					requiredCrew: fleetMiscStats.requiredCrew.toString(),
				}),
			);
		}

		const [programs, context, signer] = yield* GameService.pipe(
			Effect.flatMap((service) =>
				Effect.all([getSagePrograms(), getGameContext(), service.signer]),
			),
		);

		const starbaseKey = fleetAccount.state.StarbaseLoadingBay.starbase;
		const starbaseAccount = yield* getStarbaseAccount(starbaseKey);

		const [sagePlayerProfileAddress] = yield* findSagePlayerProfilePda(
			context.gameInfo.gameId,
			fleetAccount.data.ownerProfile,
		);

		const [playerFactionAddress] = yield* findProfileFactionPda(
			fleetAccount.data.ownerProfile,
		);

		const [starbasePlayerKey] = yield* findStarbasePlayerPda(
			starbaseKey,
			sagePlayerProfileAddress,
			starbaseAccount.data.seqId,
		);

		yield* Effect.log("Creating loadingBayToIdle IX");

		return [
			Fleet.loadingBayToIdle(
				programs.sage,
				signer,
				fleetAccount.data.ownerProfile,
				playerFactionAddress,
				fleetAccount.key,
				starbaseKey,
				starbasePlayerKey,
				context.gameInfo.gameId,
				context.gameInfo.gameStateId,
				context.keyIndexes.sage,
			),
		];
	});
