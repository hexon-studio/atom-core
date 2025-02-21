import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { Effect } from "effect";
import { getRecipeAccount } from "~/libs/@staratlas/crafting";
import { createCraftingBurnConsumablesIxs } from "../crafting/instructions/createCraftingBurnConsumablesIxs";
import { createCraftingClaimOutputsIxs } from "../crafting/instructions/createCraftingClaimOutputsIxs";
import { createCraftingCloseProcessIx } from "../crafting/instructions/createCraftingCloseProcessIx";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const stopCrafting = ({
	craftingId,
	recipe,
	starbaseCoords,
}: {
	craftingId: BN;
	starbaseCoords: [number, number];
	recipe: PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Effect.log("Stop crafting...").pipe(
			Effect.annotateLogs({ craftingId: craftingId.toString() }),
		);

		const recipeAccount = yield* getRecipeAccount(recipe);

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

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs: [...burnIxs, ...claimIxs, stopIx],
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* GameService.sendAllTransactions(txs);

		yield* Effect.log("Craft stopped!");

		return { signatures };
	});
