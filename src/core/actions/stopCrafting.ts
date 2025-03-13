import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { Effect } from "effect";
import { fetchRecipeAccount } from "~/libs/@staratlas/crafting";
import { createCraftingBurnConsumablesIxs } from "../crafting/instructions/createCraftingBurnConsumablesIxs";
import { createCraftingClaimOutputsIxs } from "../crafting/instructions/createCraftingClaimOutputsIxs";
import { createCraftingCloseProcessIx } from "../crafting/instructions/createCraftingCloseProcessIx";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const stopCrafting = ({
	craftingId,
	recipe,
	starbaseCoords,
}: {
	craftingId: BN;
	starbaseCoords: [BN, BN];
	recipe: PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Effect.log("Stop crafting...").pipe(
			Effect.annotateLogs({ craftingId: craftingId.toString() }),
		);

		const recipeAccount = yield* fetchRecipeAccount(recipe);

		// if (recipeAccount.data.status !== RecipeStatus.Active) {

		// 	yield* Effect.fail(new Error("Recipe is not active"));
		// }

		yield* Effect.log("Crafting recipe loaded").pipe(
			Effect.annotateLogs({ recipeAccount }),
		);

		const [burnIxs, claimIxs, stopIx] = yield* Effect.all([
			createCraftingBurnConsumablesIxs({
				recipeAccount,
				starbaseCoords,
				craftingId,
			}),
			createCraftingClaimOutputsIxs({
				craftingId,
				recipeAccount,
				starbaseCoords,
			}),
			createCraftingCloseProcessIx({
				craftingId,
				recipeAccount,
				starbaseCoords,
			}),
		]);

		const afterIxs = yield* createAfterIxs();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs: [...burnIxs, ...claimIxs, stopIx],
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Craft stopped!");

		return { signatures };
	});
