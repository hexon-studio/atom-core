import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { tokenMints } from "~/constants/tokens";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import {
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting";
import { findUserPointsPda } from "~/libs/@staratlas/points";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { findAssociatedTokenPda } from "~/utils/findAssociatedTokenPda";

export const createCraftingCloseProcessIx = ({
	craftingId,
	recipeAccount,
	starbaseCoords,
}: {
	craftingId: BN;
	recipeAccount: Recipe;
	starbaseCoords: [BN, BN];
}) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();
		const programs = yield* getSagePrograms();

		const signer = yield* GameService.signer;

		const [profileFaction] = yield* findProfileFactionPda(
			context.options.playerProfile,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			starbaseCoords,
		});

		const [craftingProcess] = yield* findCraftingProcessPda({
			craftingFacility: starbaseInfo.starbaseAccount.data.craftingFacility,
			craftingId,
			craftingRecipe: recipeAccount.key,
		});

		const [craftingInstance] = yield* findCraftingInstancePda({
			craftingProcess,
			starbasePlayer: starbaseInfo.starbasePlayerPubkey,
		});

		const [craftingXpKey] = yield* findUserPointsPda({
			category: "craftingXp",
			playerProfile: context.playerProfile.key,
		});

		const [councilRankXpKey] = yield* findUserPointsPda({
			category: "councilRankXp",
			playerProfile: context.playerProfile.key,
		});

		const tokenFrom = yield* findAssociatedTokenPda({
			mint: tokenMints.atlas,
			owner: craftingProcess,
		});

		return CraftingInstance.closeCraftingProcess(
			programs.sage,
			programs.crafting,
			programs.points,
			signer,
			context.playerProfile.key,
			profileFaction,
			"funder",
			starbaseInfo.starbasePlayerPubkey,
			starbaseInfo.starbaseAccount.key,
			craftingInstance,
			craftingProcess,
			starbaseInfo.starbaseAccount.data.craftingFacility,
			recipeAccount.key,
			craftingXpKey,
			context.gameInfo.points.craftingXpCategory.category,
			context.gameInfo.points.craftingXpCategory.modifier,
			councilRankXpKey,
			context.gameInfo.points.councilRankXpCategory.category,
			context.gameInfo.points.councilRankXpCategory.modifier,
			context.gameInfo.gameId,
			context.gameInfo.gameStateId,
			{ keyIndex: context.keyIndexes.sage },
			tokenFrom,
			recipeAccount.data.feeRecipient.key,
		);
	});
