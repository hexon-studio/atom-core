import type BN from "bn.js";
import { Effect } from "effect";
import {
	findSagePlayerProfilePda,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
	getCargoPodsByAuthority,
	getStarbaseAccount,
} from "~/libs/@staratlas/sage";
import { getGameContext } from "../services/GameService/utils";

export const getStarbaseInfoByCoords = ({
	starbaseCoords,
}: {
	starbaseCoords: [BN, BN];
}) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const [sagePlayerProfilePubkey] = yield* findSagePlayerProfilePda(
			context.gameInfo.game.key,
			context.playerProfile.key,
		);

		const [starbasePubkey] = yield* findStarbasePdaByCoordinates(
			context.gameInfo.game.key,
			starbaseCoords,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

		// PDA Starbase - Player
		const [starbasePlayerPubkey] = yield* findStarbasePlayerPda(
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
