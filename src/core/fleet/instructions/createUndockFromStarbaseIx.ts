import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getFleetAccount, getStarbaseAccount } from "../../utils/accounts";
import {
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbasePlayerAddress,
} from "../../utils/pdas";
import { FleetNotInStarbaseError } from "../errors";

export const createUndockFromStarbaseIx = (fleetPubkey: PublicKey) =>
	Effect.gen(function* () {
		const fleetAccount = yield* getFleetAccount(fleetPubkey);

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
			context.game.key,
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

		return Fleet.loadingBayToIdle(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			starbaseKey,
			starbasePlayerKey,
			context.game.key,
			context.game.data.gameState,
			1, // 0 - normal wallet, 1 - hot wallet
		);
	});
