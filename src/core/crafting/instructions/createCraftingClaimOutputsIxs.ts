import { getAccount } from "@solana/spl-token";
import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Data, Effect, Option } from "effect";
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
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";

export class CraftingOutputItemNotFoundError extends Data.TaggedError(
	"CraftingOutputItemNotFoundError",
) {}

export const createCraftingClaimOutputsIxs = ({
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
		const craftableItemAta = yield* findAssociatedTokenPda(
			outputItem.mint,
			craftableItem,
			true,
		);

		const [cargoTypePda] = yield* findCargoTypePda(
			outputItem.mint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const ixs = [];

		const createDestinationAta =
			yield* GameService.createAssociatedTokenAccountIdempotent(
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
				context.gameInfo.cargoStatsDefinition.key,
				context.gameInfo.game.key,
				context.gameInfo.game.data.gameState,
				craftableItemAta,
				createDestinationAta.address,
				{
					ingredientIndex: inputs.length,
				},
			),
		];
	});
