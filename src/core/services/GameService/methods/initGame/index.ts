import type { PublicKey } from "@solana/web3.js";
import { Data, Effect, Option, Ref } from "effect";
import type { GameContext } from "../..";
import { fetchFees } from "./fetchFees";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export class GameAlreadyInitializedError extends Data.TaggedError(
	"GameAlreadyInitializedError",
) {}

export const initGame = (
	owner: PublicKey,
	playerProfile: PublicKey,
	contextRef: Ref.Ref<Option.Option<GameContext>>,
) =>
	Effect.gen(function* () {
		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new GameAlreadyInitializedError());
		}

		const gameInfo = yield* fetchGameInfoOrAccounts();
		const fees = yield* fetchFees();

		return yield* Ref.updateAndGet(contextRef, () =>
			Option.some({
				gameInfo,
				playerProfile,
				owner,
				fees,
			}),
		);
	});

export type InitGame = typeof initGame;
