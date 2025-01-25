import { Data, Effect, Option, Ref } from "effect";
import { constNull } from "effect/Function";
import { programIds } from "~/constants/programs";
import type { GameContext } from "~/core/services/GameService";
import { getPlayerProfileAccout } from "~/libs/@staratlas/player-profile";
import type { RequiredOptions } from "~/types";
import { fetchFees } from "./fetchFees";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export class GameAlreadyInitializedError extends Data.TaggedError(
	"GameAlreadyInitializedError",
) {}

export class AtlasNotEnoughError extends Data.TaggedError(
	"AtlasNotEnoughError",
) {}

export class SolNotEnoughError extends Data.TaggedError("SolNotEnoughError") {}

export const initGame = (
	contextRef: Ref.Ref<Option.Option<GameContext>>,
	options: RequiredOptions,
) =>
	Effect.gen(function* () {
		const {
			atlasPrime,
			owner,
			playerProfile: playerProfileAddress,
			keypair,
			feeUrl,
		} = options;

		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new GameAlreadyInitializedError());
		}

		const [playerProfile, gameInfo, fees] = yield* Effect.all(
			[
				getPlayerProfileAccout(playerProfileAddress),
				fetchGameInfoOrAccounts(),
				feeUrl ? fetchFees({ feeUrl, owner }) : Effect.sync(constNull),
			],
			{ concurrency: "unbounded" },
		);

		const sageSignerKeyIndex = playerProfile.profileKeys.findIndex(
			(item) =>
				item.key.equals(keypair.publicKey) &&
				item.scope.equals(programIds.sageProgramId),
		);
		const pointsSignerKeyIndex = playerProfile.profileKeys.findIndex(
			(item) =>
				item.key.equals(keypair.publicKey) &&
				item.scope.equals(programIds.pointsProgramId),
		);
		const profileVaultSignerKeyIndex = playerProfile.profileKeys.findIndex(
			(item) =>
				item.key.equals(keypair.publicKey) &&
				item.scope.equals(programIds.profileVaultProgramId),
		);

		return yield* Ref.update(contextRef, () =>
			Option.some({
				gameInfo,
				owner,
				options,
				playerProfile,
				keyIndexes: {
					sage: sageSignerKeyIndex,
					points: pointsSignerKeyIndex,
					profileVault: profileVaultSignerKeyIndex,
				},
				fees,
			}),
		);
	});

export type InitGame = typeof initGame;
