import { Effect, Option, Ref } from "effect";
import { constNull } from "effect/Function";
import { programIds } from "~/constants/programs";
import type { GameContext } from "~/core/services/GameService";
import { GameAlreadyInitializedError } from "~/errors";
import { getPlayerProfileAccout } from "~/libs/@staratlas/player-profile";
import type { RequiredOptions } from "~/types";
import { fetchFees } from "./fetchFees";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export const initGame = (
	contextRef: Ref.Ref<Option.Option<GameContext>>,
	options: RequiredOptions,
) =>
	Effect.gen(function* () {
		const {
			owner,
			playerProfile: playerProfileAddress,
			keypair,
			feeUrl,
			commonApiUrl,
		} = options;

		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new GameAlreadyInitializedError());
		}

		const [playerProfileAccount, gameInfo, fees] = yield* Effect.all(
			[
				getPlayerProfileAccout(playerProfileAddress),
				fetchGameInfoOrAccounts(commonApiUrl),
				feeUrl ? fetchFees({ feeUrl, owner }) : Effect.sync(constNull),
			],
			{ concurrency: "unbounded" },
		);

		const sageSignerKeyIndex = playerProfileAccount.profileKeys.findIndex(
			(item) =>
				item.key.equals(keypair.publicKey) &&
				item.scope.equals(programIds.sageProgramId),
		);
		const pointsSignerKeyIndex = playerProfileAccount.profileKeys.findIndex(
			(item) =>
				item.key.equals(keypair.publicKey) &&
				item.scope.equals(programIds.pointsProgramId),
		);
		const profileVaultSignerKeyIndex =
			playerProfileAccount.profileKeys.findIndex(
				(item) =>
					item.key.equals(keypair.publicKey) &&
					item.scope.equals(programIds.profileVaultProgramId),
			);

		return yield* Ref.update(contextRef, () =>
			Option.some({
				gameInfo,
				owner,
				options,
				playerProfile: playerProfileAccount,
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
