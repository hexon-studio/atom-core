import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import type { StarbaseInfo } from "~/core/utils/getStarbaseInfo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";

export const createUnloadCrewIx = ({
	fleetAccount,
	starbaseInfo,
	crewAmount,
}: {
	fleetAccount: Fleet;
	starbaseInfo: Omit<StarbaseInfo, "starbaseAccount">;
	crewAmount: number;
}) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const programs = yield* getSagePrograms();

		const signer = yield* GameService.signer;

		const [profileFaction] = yield* findProfileFactionPda(
			context.playerProfile.key,
		);

		const { starbasePlayerPubkey, starbasePubkey } = starbaseInfo;

		return [
			Fleet.unloadFleetCrew(
				programs.sage,
				signer,
				context.playerProfile.key,
				profileFaction,
				fleetAccount.key,
				starbasePubkey,
				starbasePlayerPubkey,
				context.gameInfo.gameId,
				{ keyIndex: context.keyIndexes.sage, count: crewAmount },
			),
		];
	});
