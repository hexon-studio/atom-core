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
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting/pdas";
import { divideRecipeIngredients } from "~/libs/@staratlas/crafting/utils";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { getAssociatedTokenAccountBalance } from "~/utils/getAssociatedTokenAccountBalance";
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";

export const createCraftingWithdrawIngredientsIxs = ({
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

		const [profileFaction] = yield* findProfileFactionPda(
			context.options.playerProfile,
		);

		const signer = yield* GameService.signer;

		const { inputs } = divideRecipeIngredients(recipeAccount);

		const provider = yield* SolanaService.anchorProvider;

		const ixs = [];

		for (const [ingredientIndex, inputIngredient] of inputs.entries()) {
			const [cargoTypePda] = yield* findCargoTypePda(
				inputIngredient.mint,
				context.gameInfo.cargoStatsDefinitionId,
				context.gameInfo.cargoStatsDefinitionSeqId,
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

			const inputIngridientAta = yield* findAssociatedTokenPda(
				inputIngredient.mint,
				craftingProcess,
				true,
			);

			const amount =
				yield* getAssociatedTokenAccountBalance(inputIngridientAta);

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
				recipeAccount.key,
				starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
				cargoTypePda,
				context.gameInfo.cargoStatsDefinitionId,
				inputIngridientAta,
				createDestinationAta.address,
				inputIngredient.mint,
				context.gameInfo.gameId,
				context.gameInfo.gameStateId,
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
