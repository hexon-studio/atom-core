import type { CargoStatsDefinition } from "@staratlas/cargo";
import type { Game } from "@staratlas/sage";
import { Effect } from "effect";
import { getCargoStatsDefinitionAccount } from "~/libs/@staratlas/cargo";
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source";
import { getGameAccount } from "~/libs/@staratlas/sage";
import type {
	CreateKeypairError,
	CreateProviderError,
	SolanaService,
} from "../../../SolanaService";
import { type GameNotFoundError, findGame } from "../findGame";
import { type GameInfo, fetchGameInfo } from "./fetchGameInfo";

const mapGameAccoutToGameInfo = ({
	gameAccount,
	cargoStatsDefinition,
}: {
	gameAccount: Game;
	cargoStatsDefinition: CargoStatsDefinition;
}): GameInfo => {
	return {
		cargoStatsDefinition: {
			key: cargoStatsDefinition.key,
			data: {
				seqId: cargoStatsDefinition.data.seqId,
				statsCount: cargoStatsDefinition.data.statsCount,
			},
		},
		game: {
			key: gameAccount.key,
			data: {
				profile: gameAccount.data.profile,
				crafting: {
					domain: gameAccount.data.crafting.domain,
				},
				cargo: {
					statsDefinition: gameAccount.data.cargo.statsDefinition,
				},
				gameState: gameAccount.data.gameState,
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
			},
		},
	};
};

export const fetchGameInfoOrAccounts = (): Effect.Effect<
	GameInfo,
	| CreateKeypairError
	| CreateProviderError
	| GameNotFoundError
	| ReadFromRPCError,
	SolanaService
> =>
	fetchGameInfo().pipe(
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
