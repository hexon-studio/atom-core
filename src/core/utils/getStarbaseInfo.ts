import type BN from "bn.js";
import { Effect } from "effect";
import {
	fetchStarbaseAccount,
	findSagePlayerProfilePda,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
	getCargoPodsByAuthority,
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
			context.gameInfo.gameId,
			context.playerProfile.key,
		);

		const [starbasePubkey] = yield* findStarbasePdaByCoordinates(
			context.gameInfo.gameId,
			starbaseCoords,
		);

		const starbaseAccount = yield* fetchStarbaseAccount(starbasePubkey);

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
