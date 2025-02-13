import { getAccount } from "@solana/spl-token";
import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import {
	findCraftableItemPda,
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting/pdas";
import { divideRecipeIngredients } from "~/libs/@staratlas/crafting/utils";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { getAssociatedTokenAccountBalance } from "~/utils/getAssociatedTokenAccountBalance";
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";

export const createCraftingWithdrawIngredientsIxs = ({
	craftingId,
	recipe,
	starbaseCoords,
}: {
	craftingId: BN;
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

		const [profileFaction] = yield* findProfileFactionPda(
			context.options.playerProfile,
		);

		const signer = yield* GameService.signer;

		const { inputs } = divideRecipeIngredients(recipe);

		const provider = yield* SolanaService.anchorProvider;

		const ixs = [];

		for (const [ingredientIndex, inputIngredient] of inputs.entries()) {
			const [cargoTypePda] = yield* findCargoTypePda(
				inputIngredient.mint,
				context.gameInfo.cargoStatsDefinition.key,
				context.gameInfo.cargoStatsDefinition.data.seqId,
			);

			const createDestinationAta =
				yield* GameService.createAssociatedTokenAccountIdempotent(
					inputIngredient.mint,
					starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
					true,
				);

			const maybeDestinationAta = yield* Effect.tryPromise(() =>
				getAccount(
					provider.connection,
					createDestinationAta.address,
					"confirmed",
				),
			).pipe(Effect.option);

			if (Option.isNone(maybeDestinationAta)) {
				ixs.push(createDestinationAta.instructions);
			}

			const [craftableItem] = yield* findCraftableItemPda(inputIngredient.mint);

			const craftableItemAta = yield* findAssociatedTokenPda(
				inputIngredient.mint,
				craftableItem,
				true,
			);

			const amount = yield* getAssociatedTokenAccountBalance(craftableItemAta);

			const ix = CraftingInstance.withdrawCraftingIngredient(
				programs.sage,
				programs.cargo,
				programs.crafting,
				signer,
				context.playerProfile.key,
				profileFaction,
				starbaseInfo.starbasePlayerPubkey,
				starbaseInfo.starbaseAccount.key,
				craftingInstance,
				craftingProcess,
				starbaseInfo.starbaseAccount.data.craftingFacility,
				recipe.key,
				starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
				cargoTypePda,
				context.gameInfo.cargoStatsDefinition.key,
				craftableItemAta,
				createDestinationAta.address,
				inputIngredient.mint,
				context.gameInfo.game.key,
				context.gameInfo.game.data.gameState,
				{
					amount,
					ingredientIndex,
					keyIndex: context.keyIndexes.sage,
				},
			);

			ixs.push(ix);
		}

		return ixs;
	});
