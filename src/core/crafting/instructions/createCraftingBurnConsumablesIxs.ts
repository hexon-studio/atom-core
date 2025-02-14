import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import {
	divideRecipeIngredients,
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting";
import { findAssociatedTokenPda } from "~/utils/findAssociatedTokenPda";

export const createCraftingBurnConsumablesIxs = ({
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

		const { inputs } = divideRecipeIngredients(recipeAccount);

		const ixs = [];

		for (const [ingredientIndex, inputIngredient] of inputs.entries()) {
			const ingredientAta = yield* findAssociatedTokenPda({
				mint: inputIngredient.mint,
				owner: craftingProcess,
			});

			const ix = CraftingInstance.burnCraftingConsumables(
				programs.sage,
				programs.crafting,
				starbaseInfo.starbasePlayerPubkey,
				starbaseInfo.starbaseAccount.key,
				craftingInstance,
				craftingProcess,
				starbaseInfo.starbaseAccount.data.craftingFacility,
				recipeAccount.key,
				context.gameInfo.gameId,
				context.gameInfo.gameStateId,
				ingredientAta,
				inputIngredient.mint,
				{
					ingredientIndex,
				},
			);

			ixs.push(ix);
		}

		return ixs;
	});
