import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import {
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting/pdas";
import { divideRecipeIngredients } from "~/libs/@staratlas/crafting/utils";
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";

export const createCraftingBurnConsumablesIxs = ({
	craftingId,
	quantity,
	recipe,
	starbaseCoords,
}: {
	craftingId: BN;
	quantity: number;
	recipe: Recipe;
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
			craftingRecipe: recipe.key,
		});

		const [craftingInstance] = yield* findCraftingInstancePda({
			craftingProcess,
			starbasePlayer: starbaseInfo.starbasePlayerPubkey,
		});

		const { inputs } = divideRecipeIngredients(recipe);

		const ixs = [];

		for (const [ingredientIndex, inputIngredient] of inputs.entries()) {
			const ingredientAta = yield* findAssociatedTokenPda(
				inputIngredient.mint,
				craftingProcess,
				true,
			);

			const ix = CraftingInstance.burnCraftingConsumables(
				programs.sage,
				programs.crafting,
				starbaseInfo.starbasePlayerPubkey,
				starbaseInfo.starbaseAccount.key,
				craftingInstance,
				craftingProcess,
				starbaseInfo.starbaseAccount.data.craftingFacility,
				recipe.key,
				context.gameInfo.game.key,
				context.gameInfo.game.data.gameState,
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
