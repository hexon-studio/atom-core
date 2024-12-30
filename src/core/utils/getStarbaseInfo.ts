import type BN from "bn.js";
import { Effect } from "effect";
import {
	getCargoPodsByAuthority,
	getSagePlayerProfileAddress,
	getStarbaseAccount,
	getStarbaseAddressByCoordinates,
	getStarbasePlayerAddress,
} from "~/libs/@staratlas/sage";
import { getGameContext } from "../services/GameService/utils";

export const getStarbaseInfoByCoords = ({
	startbaseCoords,
}: {
	startbaseCoords: [BN, BN];
}) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
			context.gameInfo.game.key,
			context.playerProfile.key,
		);

		const starbasePubkey = yield* getStarbaseAddressByCoordinates(
			context.gameInfo.game.key,
			startbaseCoords,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

		// PDA Starbase - Player
		const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
			starbasePubkey,
			sagePlayerProfilePubkey,
			starbaseAccount.data.seqId,
		);

		// This PDA account is the owner of all player resource token accounts
		// in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
		const starbasePlayerCargoPodsAccount =
			yield* getCargoPodsByAuthority(starbasePlayerPubkey);

		return {
			sagePlayerProfilePubkey,
			starbaseAccount,
			starbasePlayerCargoPodsAccountPubkey: starbasePlayerCargoPodsAccount.key,
			starbasePlayerPubkey,
			starbasePubkey,
		};
	});

export type StarbaseInfo = Effect.Effect.Success<
	ReturnType<typeof getStarbaseInfoByCoords>
>;
