import { Recipe, RecipeStatus } from "@staratlas/crafting";
import { readAllFromRPC } from "@staratlas/data-source";
import { Effect, Array as EffectArray, Option } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { SolanaService } from "~/core/services/SolanaService";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";

type Param = {
	globalOpts: GlobalOptions;
};

export const makeRecipeListCommand = ({ globalOpts }: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.flatMap(() =>
			Effect.all([getSagePrograms(), SolanaService.anchorProvider]),
		),
		Effect.flatMap(([programs, provider]) =>
			Effect.tryPromise(() =>
				readAllFromRPC(provider.connection, programs.crafting, Recipe),
			),
		),
		Effect.map(
			EffectArray.filterMap((res) =>
				res.type === "ok" && res.data.data.status === RecipeStatus.Active
					? Option.some(res.data)
					: Option.none(),
			),
		),
		Effect.tap((recipes) =>
			Effect.logInfo("Recipes list found").pipe(
				Effect.annotateLogs({
					recipes,
				}),
			),
		),
		Effect.provide(createMainLiveService(globalOpts)),
	);
