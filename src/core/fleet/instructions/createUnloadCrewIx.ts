import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import type { StarbaseInfo } from "~/core/utils/getStarbaseInfo";

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
			fleetAccount.data.ownerProfile,
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
				context.gameInfo.game.key,
				{ keyIndex: context.keyIndexes.sage, count: crewAmount },
			),
		];
	});
