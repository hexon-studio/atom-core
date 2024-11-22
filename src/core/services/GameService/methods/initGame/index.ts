import type { PublicKey } from "@solana/web3.js";
import { Data, Effect, Option, Ref } from "effect";
import { constNull } from "effect/Function";
import type { GameContext } from "../..";
import { programIds } from "../../../../programs";
import { getPlayerProfileAccout } from "../../../../utils/accounts";
import { fetchFees } from "./fetchFees";
import { fetchGameInfoOrAccounts } from "./fetchGameInfoOrAccount";

export class GameAlreadyInitializedError extends Data.TaggedError(
	"GameAlreadyInitializedError",
) {}

export class AtlasNotEnoughError extends Data.TaggedError(
	"AtlasNotEnoughError",
) {}

export const initGame = ({
	owner,
	playerProfile: playerProfileAddress,
	signerAddress,
	contextRef,
	feeUrl,
}: {
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
				Effect.fromNullable(feeUrl).pipe(
					Effect.flatMap((feeUrl) => fetchFees({ feeUrl, owner })),
					Effect.orElseSucceed(constNull),
				),
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

		return yield* Ref.updateAndGet(contextRef, () =>
			Option.some({
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
