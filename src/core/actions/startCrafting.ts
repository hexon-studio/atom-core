import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { Effect } from "effect";
import {
	fetchRecipeAccount,
	generateCraftingProcessId,
} from "~/libs/@staratlas/crafting";
import { createCraftingDepositIngredientsIxs } from "../crafting/instructions/createCraftingDepositIngredientsIxs";
import { createCraftingProcessIx } from "../crafting/instructions/createCraftingProcessIx";
import { createCraftingStartIxs } from "../crafting/instructions/createCraftingStartIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

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
		const craftingId = generateCraftingProcessId();
		yield* Effect.log("Start crafting...").pipe(
			Effect.annotateLogs({ craftingId: craftingId.toString() }),
		);

		const recipeAccount = yield* fetchRecipeAccount(recipe);
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

		const afterIxs = yield* createAfterIxs();
		const { options } = yield* getGameContext();

		const maxIxsPerTransaction =
			options.kind === "exec" ? options.maxIxsPerTransaction : 1;

		const txs = yield* GameService.buildAndSignTransaction({
			ixs: [createIx, ...depositIxs, ...startIxs],
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Craft started!");

		return { signatures, craftingId: craftingId.toJSON() };
	});
