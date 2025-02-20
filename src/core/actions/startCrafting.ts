import type { PublicKey } from "@solana/web3.js";
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

export const startCrafting = ({
	recipe,
	starbaseCoords,
	crewAmount,
	quantity,
}: {
	starbaseCoords: [number, number];
	recipe: PublicKey;
	crewAmount: number;
	quantity: number;
}) =>
	Effect.gen(function* () {
		const craftingId = generateCraftingProcessId();

		yield* Effect.log("Start crafting...").pipe(
			Effect.annotateLogs({ craftingId: craftingId.toString() }),
		);

		const recipeAccount = yield* getRecipeAccount(recipe);

		yield* Effect.log("Crafting recipe loaded").pipe(
			Effect.annotateLogs({ recipeAccount }),
		);

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
