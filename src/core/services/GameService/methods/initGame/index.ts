import { Effect, Option, Ref } from "effect";
import { programIds } from "~/constants/programs";
import type { GameContext } from "~/core/services/GameService";
import { GameAlreadyInitializedError } from "~/errors";
import { getPlayerProfileAccount } from "~/libs/@staratlas/player-profile";
import type { GlobalOptions } from "~/utils/globalOptions";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export const initGame = (
	contextRef: Ref.Ref<Option.Option<GameContext>>,
	options: GlobalOptions,
) =>
	Effect.gen(function* () {
		const { owner, playerProfile, keypair, commonApiUrl } = options;

		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new GameAlreadyInitializedError());
		}

		const [playerProfileAccount, gameInfo] = yield* Effect.all(
			[
				getPlayerProfileAccount(playerProfile),
				fetchGameInfoOrAccounts(commonApiUrl),
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
			}),
		);
	}).pipe();

export type InitGame = typeof initGame;
