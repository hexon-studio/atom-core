import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import type { StarbaseInfo } from "~/core/utils/getStarbaseInfo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";

export const createLoadCrewIx = ({
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
			fleetAccount.data.ownerProfile,
		);

		const { starbasePlayerPubkey, starbasePubkey } = starbaseInfo;

		return [
			Fleet.loadFleetCrew(
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
