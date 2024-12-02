import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getStarbaseAccount } from "../../utils/accounts";
import {
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbasePlayerAddress,
} from "../../utils/pdas";
import { FleetNotInStarbaseError } from "../errors";

export const createUndockFromStarbaseIx = (fleetAccount: Fleet) =>
	Effect.gen(function* () {
		if (!fleetAccount.state.StarbaseLoadingBay) {
			return yield* Effect.fail(new FleetNotInStarbaseError());
		}

		const [programs, context, signer] = yield* GameService.pipe(
			Effect.flatMap((service) =>
				Effect.all([SagePrograms, getGameContext(), service.signer]),
			),
		);

		const starbaseKey = fleetAccount.state.StarbaseLoadingBay.starbase;
		const starbaseAccount = yield* getStarbaseAccount(starbaseKey);

		const sagePlayerProfileAddress = yield* getSagePlayerProfileAddress(
			context.gameInfo.game.key,
			fleetAccount.data.ownerProfile,
		);

		const playerFactionAddress = yield* getProfileFactionAddress(
			fleetAccount.data.ownerProfile,
		);

		const starbasePlayerKey = yield* getStarbasePlayerAddress(
			starbaseKey,
			sagePlayerProfileAddress,
			starbaseAccount.data.seqId,
		);

		yield* Effect.log("Creating loadingBayToIdle IX");

		return Fleet.loadingBayToIdle(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			starbaseKey,
			starbasePlayerKey,
			context.gameInfo.game.key,
			context.gameInfo.game.data.gameState,
			context.keyIndexes.sage,
		);
	});
