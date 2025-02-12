import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, Array as EffectArray } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import { getCraftingFacilityAccount } from "~/libs/@staratlas/crafting/accounts";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";

export const createCraftingProcessIx = ({
	craftingId,
	numCrew,
	quantity,
	recipeAccount,
	starbaseCoords,
}: {
	craftingId: BN;
	numCrew: number;
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

		const craftingFacility = yield* getCraftingFacilityAccount(
			starbaseInfo.starbaseAccount.data.craftingFacility,
		);

		const recipeCategoryIndex = yield* EffectArray.findFirstIndex(
			craftingFacility.recipeCategories,
			(recipeCategory) => recipeCategory.equals(recipeAccount.data.category),
		);

		return CraftingInstance.createCraftingProcess(
			programs.sage,
			programs.crafting,
			signer,
			context.playerProfile.key,
			profileFaction,
			starbaseInfo.starbasePlayerPubkey,
			starbaseInfo.starbaseAccount.key,
			context.gameInfo.game.key,
			context.gameInfo.game.data.gameState,
			starbaseInfo.starbaseAccount.data.craftingFacility,
			recipeAccount.key,
			context.gameInfo.game.data.crafting.domain,
			{
				craftingId,
				keyIndex: context.keyIndexes.sage,
				numCrew: new BN(numCrew),
				quantity: new BN(quantity),
				recipeCategoryIndex: recipeCategoryIndex,
			},
		);
	});
