import type { PublicKey } from "@solana/web3.js";
import { Data, Effect, Option, Ref } from "effect";
import type { GameContext } from "../..";
import {
	getCargoStatsDefinitionAccount,
	getGameAccount,
} from "../../../../utils/accounts";
import { findGame } from "../findGame";

export class AlreadyInitializedError extends Data.TaggedError(
	"AlreadyInitializedError",
) {}

export const initGame = (
	owner: PublicKey,
	playerProfile: PublicKey,
	contextRef: Ref.Ref<Option.Option<GameContext>>,
) =>
	Effect.gen(function* () {
		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new AlreadyInitializedError());
		}

		const gameAccount = yield* findGame;

		const game = yield* getGameAccount(gameAccount.publicKey);

		const cargoStatsDefinition = yield* getCargoStatsDefinitionAccount(
			game.data.cargo.statsDefinition,
		);

		return yield* Ref.updateAndGet(contextRef, () =>
			Option.some({
				game,
				cargoStatsDefinition,
				playerProfile,
				owner,
			}),
		);
	});

export type InitGame = typeof initGame;
