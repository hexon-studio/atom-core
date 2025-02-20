import type { PublicKey } from "@solana/web3.js";
import { CraftingFacility, Recipe } from "@staratlas/crafting";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { readFromSage } from "../data-source";

export const getCraftingFacilityAccount = (facility: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.crafting, facility, CraftingFacility),
		),
	);

export const getRecipeAccount = (recipe: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.crafting, recipe, Recipe),
		),
	);
