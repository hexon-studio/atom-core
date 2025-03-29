import { Recipe, RecipeStatus } from "@staratlas/crafting";
import { Console, Effect, Array as EffectArray, Option } from "effect";
import { getSagePrograms } from "~/core/programs";
import { readAllFromSage } from "~/libs/@staratlas/data-source/readAllFromSage";
import { jsonStringify } from "~/utils/jsonStringify";
import type { AtomQueryOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	globalOpts: AtomQueryOptions;
};

export const runRecipeList = async ({ globalOpts }: Param) =>
	makeAtomCommand(() =>
		getSagePrograms().pipe(
			Effect.flatMap((programs) => readAllFromSage(programs.crafting, Recipe)),
			Effect.map(
				EffectArray.filterMap((res) =>
					res.type === "ok" && res.data.data.status === RecipeStatus.Active
						? Option.some(res.data)
						: Option.none(),
				),
			),
			Effect.map(jsonStringify),
			Effect.tap(Console.log),
		),
	)(globalOpts);
