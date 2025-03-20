import type { PublicKey } from "@solana/web3.js";
import { CraftingFacility, CraftingProcess, Recipe } from "@staratlas/crafting";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { readFromSage } from "../data-source";

export const fetchCraftingFacilityAccount = (facility: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.crafting, facility, CraftingFacility),
		),
	);

export const fetchCraftingProcessAccount = (process: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.crafting, process, CraftingProcess),
		),
	);
export const fetchRecipeAccount = (recipe: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.crafting, recipe, Recipe),
		),
	);
