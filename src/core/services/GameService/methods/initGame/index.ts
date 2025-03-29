import { Effect, Match, Option, Ref } from "effect";
import { programIds } from "~/constants/programs";
import type { GameContext } from "~/core/services/GameService";
import { GameAlreadyInitializedError } from "~/errors";
import { fetchPlayerProfileAccount } from "~/libs/@staratlas/player-profile";
import type { GlobalOptions } from "~/types";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export const initGame = (
	contextRef: Ref.Ref<Option.Option<GameContext>>,
	options: GlobalOptions,
) =>
	Effect.gen(function* () {
		const { playerProfile, commonApiUrl } = options;

		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new GameAlreadyInitializedError());
		}

		const [playerProfileAccount, gameInfo] = yield* Effect.all(
			[
				fetchPlayerProfileAccount(playerProfile),
				fetchGameInfoOrAccounts(commonApiUrl),
			],
			{ concurrency: "unbounded" },
		);

		const keyIndexes = Match.value(options).pipe(
			Match.when({ kind: "exec" }, (options) => {
				const sageSignerKeyIndex = playerProfileAccount.profileKeys.findIndex(
					(item) =>
						item.key.equals(options.keypair.publicKey) &&
						item.scope.equals(programIds.sageProgramId),
				);
				const pointsSignerKeyIndex = playerProfileAccount.profileKeys.findIndex(
					(item) =>
						item.key.equals(options.keypair.publicKey) &&
						item.scope.equals(programIds.pointsProgramId),
				);
				const profileVaultSignerKeyIndex =
					playerProfileAccount.profileKeys.findIndex(
						(item) =>
							item.key.equals(options.keypair.publicKey) &&
							item.scope.equals(programIds.profileVaultProgramId),
					);

				return {
					sage: sageSignerKeyIndex,
					points: pointsSignerKeyIndex,
					profileVault: profileVaultSignerKeyIndex,
				};
			}),
			Match.when({ kind: "query" }, () => ({
				sage: -1,
				points: -1,
				profileVault: -1,
			})),
			Match.exhaustive,
		);

		return yield* Ref.update(contextRef, () =>
			Option.some({
				gameInfo,
				options,
				playerProfile: playerProfileAccount,
				keyIndexes,
			}),
		);
	});

export type InitGame = typeof initGame;
