import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { Effect } from "effect";
import {
	generateCraftingProcessId,
	getRecipeAccount,
} from "~/libs/@staratlas/crafting";
import { createCraftingDepositIngredientsIxs } from "../crafting/instructions/createCraftingDepositIngredientsIxs";
import { createCraftingProcessIx } from "../crafting/instructions/createCraftingProcessIx";
import { createCraftingStartIxs } from "../crafting/instructions/createCraftingStartIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

/**
 * Initiates a crafting process at a starbase
 * @param recipe - The recipe public key to craft
 * @param starbaseCoords - The coordinates of the starbase [x, y]
 * @param crewAmount - Number of crew members to assign
 * @param quantity - Amount of items to craft
 */
export const startCrafting = ({
	recipe,
	starbaseCoords,
	crewAmount,
	quantity,
}: {
	starbaseCoords: [BN, BN];
	recipe: PublicKey;
	crewAmount: number;
	quantity: number;
}) =>
	Effect.gen(function* () {
		// Initialize crafting process
		const craftingId = generateCraftingProcessId();
		yield* Effect.log("Start crafting...").pipe(
			Effect.annotateLogs({ craftingId: craftingId.toString() }),
		);

		// Load recipe data
		const recipeAccount = yield* getRecipeAccount(recipe);
		yield* Effect.log("Crafting recipe loaded").pipe(
			Effect.annotateLogs({ recipeAccount }),
		);

		// Generate crafting instructions
		const [createIx, depositIxs, startIxs] = yield* Effect.all([
			createCraftingProcessIx({
				recipeAccount,
				starbaseCoords,
				craftingId,
				numCrew: crewAmount,
				quantity,
			}),
			createCraftingDepositIngredientsIxs({
				craftingId,
				quantity,
				recipeAccount,
				starbaseCoords,
			}),
			createCraftingStartIxs({
				craftingId,
				recipeAccount,
				starbaseCoords,
			}),
		]);

		// Prepare and execute transactions
		const drainVaultIx = yield* createDrainVaultIx();
		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs: [createIx, ...depositIxs, ...startIxs],
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Craft started!");

		return { signatures, craftingId: craftingId.toJSON() };
	});
