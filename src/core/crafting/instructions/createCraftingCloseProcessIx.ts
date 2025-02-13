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
} from "~/libs/@staratlas/crafting/pdas";
import { findUserPointsPda } from "~/libs/@staratlas/points";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";

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

		const tokenFrom = yield* findAssociatedTokenPda(
			tokenMints.atlas,
			craftingProcess,
			true,
		);

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
			context.gameInfo.game.data.points.craftingXpCategory.category,
			context.gameInfo.game.data.points.craftingXpCategory.modifier,
			councilRankXpKey,
			context.gameInfo.game.data.points.councilRankXpCategory.category,
			context.gameInfo.game.data.points.councilRankXpCategory.modifier,
			context.gameInfo.game.key,
			context.gameInfo.game.data.gameState,
			{ keyIndex: context.keyIndexes.sage },
			tokenFrom,
			recipeAccount.data.feeRecipient.key,
		);
	});
