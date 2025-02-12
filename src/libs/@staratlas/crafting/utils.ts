import type { Recipe } from "@staratlas/crafting";
import { BN } from "bn.js";
import { Array as EffectArray } from "effect";

export const generateCraftingProcessId = () => {
	const tempBytes = new Uint8Array(256);
	const tempRandomBytes = crypto.getRandomValues(tempBytes);

	const formattedRandomBytes = Buffer.from(tempRandomBytes).readUIntLE(0, 6);

	return new BN(formattedRandomBytes);
};

export const divideRecipeIngredients = (recipe: Recipe) => {
	const [outputs, inputs] = EffectArray.partition(
		recipe.ingredientInputsOutputs,
		(_, i) =>
			i < recipe.ingredientInputsOutputs.length - recipe.data.outputsCount,
	);

	return { inputs, outputs };
};
