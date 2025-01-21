import type { PublicKey } from "@solana/web3.js";
import { Data, Effect, Option, Ref } from "effect";
import { constNull } from "effect/Function";
import { programIds } from "~/constants/programs";
import type { GameContext } from "~/core/services/GameService";
import { getPlayerProfileAccout } from "~/libs/@staratlas/player-profile";
import { fetchFees } from "./fetchFees";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export class GameAlreadyInitializedError extends Data.TaggedError(
	"GameAlreadyInitializedError",
) {}

export class AtlasNotEnoughError extends Data.TaggedError(
	"AtlasNotEnoughError",
) {}

export class SolNotEnoughError extends Data.TaggedError("SolNotEnoughError") {}

export const initGame = ({
	atlasPrime,
	owner,
	playerProfile: playerProfileAddress,
	signerAddress,
	contextRef,
	feeUrl,
}: {
	atlasPrime: boolean;
	owner: PublicKey;
	playerProfile: PublicKey;
	signerAddress: PublicKey;
	feeUrl?: string;
	contextRef: Ref.Ref<Option.Option<GameContext>>;
}) =>
	Effect.gen(function* () {
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
				item.key.equals(signerAddress) &&
				item.scope.equals(programIds.sageProgramId),
		);
		const pointsSignerKeyIndex = playerProfile.profileKeys.findIndex(
			(item) =>
				item.key.equals(signerAddress) &&
				item.scope.equals(programIds.pointsProgramId),
		);
		const profileVaultSignerKeyIndex = playerProfile.profileKeys.findIndex(
			(item) =>
				item.key.equals(signerAddress) &&
				item.scope.equals(programIds.profileVaultProgramId),
		);

		return yield* Ref.update(contextRef, () =>
			Option.some({
				atlasPrime,
				gameInfo,
				playerProfile,
				keyIndexes: {
					sage: sageSignerKeyIndex,
					points: pointsSignerKeyIndex,
					profileVault: profileVaultSignerKeyIndex,
				},
				owner,
				fees,
			}),
		);
	});

export type InitGame = typeof initGame;
