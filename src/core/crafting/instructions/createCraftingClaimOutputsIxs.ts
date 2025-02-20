import { getAccount } from "@solana/spl-token";
import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import { CraftingOutputItemNotFoundError } from "~/errors";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import {
	divideRecipeIngredients,
	findCraftableItemPda,
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting";
import { findAssociatedTokenPda } from "~/utils/findAssociatedTokenPda";

export const createCraftingClaimOutputsIxs = ({
	craftingId,
	recipeAccount,
	starbaseCoords,
}: {
	craftingId: BN;
	recipeAccount: Recipe;
	starbaseCoords: [number, number];
}) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();
		const programs = yield* getSagePrograms();

		const {
			inputs,
			outputs: [outputItem],
		} = divideRecipeIngredients(recipeAccount);

		if (!outputItem) {
			return yield* new CraftingOutputItemNotFoundError();
		}

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

		const [craftableItem] = yield* findCraftableItemPda(outputItem.mint);
		const craftableItemAta = yield* findAssociatedTokenPda({
			mint: outputItem.mint,
			owner: craftableItem,
		});

		const [cargoTypePda] = yield* findCargoTypePda(
			outputItem.mint,
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const ixs = [];

		const createDestinationAta =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				outputItem.mint,
				starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
				true,
			);

		const provider = yield* SolanaService.anchorProvider;

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

		return [
			...ixs,
			CraftingInstance.claimCraftingOutputs(
				programs.sage,
				programs.cargo,
				programs.crafting,
				starbaseInfo.starbasePlayerPubkey,
				starbaseInfo.starbaseAccount.key,
				craftingInstance,
				craftingProcess,
				starbaseInfo.starbaseAccount.data.craftingFacility,
				recipeAccount.key,
				craftableItem,
				starbaseInfo.starbasePlayerCargoPodsAccountPubkey,
				cargoTypePda,
				context.gameInfo.cargoStatsDefinitionId,
				context.gameInfo.gameId,
				context.gameInfo.gameStateId,
				craftableItemAta,
				createDestinationAta.address,
				{
					ingredientIndex: inputs.length,
				},
			),
		];
	});
