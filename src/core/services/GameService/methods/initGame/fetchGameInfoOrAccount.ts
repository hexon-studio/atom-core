import type { CargoStatsDefinition } from "@staratlas/cargo";
import type { Game } from "@staratlas/sage";
import { Effect } from "effect";
import type { GameNotFoundError, ReadFromRPCError } from "~/errors";
import { getCargoStatsDefinitionAccount } from "~/libs/@staratlas/cargo";
import { getGameAccount } from "~/libs/@staratlas/sage";
import type { SolanaService } from "../../../SolanaService";
import { findGame } from "../findGame";
import { type GameInfo, fetchGameInfo } from "./fetchGameInfo";

const mapGameAccoutToGameInfo = ({
	gameAccount,
	cargoStatsDefinition,
}: {
	gameAccount: Game;
	cargoStatsDefinition: CargoStatsDefinition;
}): GameInfo => {
	return {
		cargoStatsDefinitionId: cargoStatsDefinition.key,
		cargoStatsDefinitionSeqId: cargoStatsDefinition.data.seqId,
		gameId: gameAccount.key,
		gameStateId: gameAccount.data.gameState,
		craftingDomain: gameAccount.data.gameState,
		points: {
			pilotXpCategory: {
				category:
					// @ts-ignore
					gameAccount.data.points.pilotXpCategory.category,
				modifier:
					// @ts-ignore
					gameAccount.data.points.pilotXpCategory.modifier,
			},
			councilRankXpCategory: {
				category:
					// @ts-ignore
					gameAccount.data.points.councilRankXpCategory.category,

				modifier:
					// @ts-ignore
					gameAccount.data.points.councilRankXpCategory.modifier,
			},
			craftingXpCategory: {
				category:
					// @ts-ignore
					gameAccount.data.points.craftingXpCategory.category,
				modifier:
					// @ts-ignore
					gameAccount.data.points.craftingXpCategory.modifier,
			},
			lpCategory: {
				// @ts-ignore
				category: gameAccount.data.points.lpCategory.category,
				// @ts-ignore
				modifier: gameAccount.data.points.lpCategory.modifier,
			},
			miningXpCategory: {
				category:
					// @ts-ignore
					gameAccount.data.points.miningXpCategory.category,
				modifier:
					// @ts-ignore
					gameAccount.data.points.miningXpCategory.modifier,
			},
			dataRunningXpCategory: {
				category:
					// @ts-ignore
					gameAccount.data.points.dataRunningXpCategory.category,
				modifier:
					// @ts-ignore
					gameAccount.data.points.dataRunningXpCategory.modifier,
			},
		},
	};
};

export const fetchGameInfoOrAccounts = (
	commonApiUrl?: string,
): Effect.Effect<
	GameInfo,
	GameNotFoundError | ReadFromRPCError,
	SolanaService
> =>
	Effect.fromNullable(commonApiUrl).pipe(
		Effect.flatMap(fetchGameInfo),
		Effect.orElse(() =>
			Effect.Do.pipe(
				Effect.bind("gameAccount", () =>
					findGame.pipe(
						Effect.flatMap((game) => getGameAccount(game.publicKey)),
					),
				),
				Effect.bind("cargoStatsDefinition", ({ gameAccount }) =>
					getCargoStatsDefinitionAccount(
						gameAccount.data.cargo.statsDefinition,
					),
				),
				Effect.map(mapGameAccoutToGameInfo),
			),
		),
	);
