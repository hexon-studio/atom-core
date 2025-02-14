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
	divideRecipeIngredients,
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";

export const createCraftingDepositIngredientsIxs = ({
	craftingId,
	quantity,
	recipeAccount,
	starbaseCoords,
}: {
	craftingId: BN;
	quantity: number;
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

		const { inputs } = divideRecipeIngredients(recipeAccount);

		const provider = yield* SolanaService.anchorProvider;

		const ixs = [];

		for (const [ingredientIndex, inputIngredient] of inputs.entries()) {
			const [cargoTypePda] = yield* findCargoTypePda(
				inputIngredient.mint,
				context.gameInfo.cargoStatsDefinitionId,
				context.gameInfo.cargoStatsDefinitionSeqId,
			);

			const createIngredientAta =
				yield* SolanaService.createAssociatedTokenAccountIdempotent(
					inputIngredient.mint,
					craftingProcess,
					true,
				);

			const maybeIngredientAtaAccount = yield* Effect.tryPromise(() =>
				getAccount(
					provider.connection,
					createIngredientAta.address,
					"confirmed",
				),
			).pipe(Effect.option);

			if (Option.isNone(maybeIngredientAtaAccount)) {
				ixs.push(createIngredientAta.instructions);
			}

			const createStarbasePodMintAta =
				yield* SolanaService.createAssociatedTokenAccountIdempotent(
					inputIngredient.mint,
					starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
					true,
				);

			const maybeStarbasePodMintAta = yield* Effect.tryPromise(() =>
				getAccount(
					provider.connection,
					createStarbasePodMintAta.address,
					"confirmed",
				),
			).pipe(Effect.option);

			if (Option.isNone(maybeStarbasePodMintAta)) {
				ixs.push(createStarbasePodMintAta.instructions);
			}

			const amount = inputIngredient.amount.muln(quantity);

			const ix = CraftingInstance.depositCraftingIngredient(
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
				createStarbasePodMintAta.address,
				createIngredientAta.address,
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
