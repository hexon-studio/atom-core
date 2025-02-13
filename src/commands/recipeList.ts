import { Recipe, RecipeStatus } from "@staratlas/crafting";
import { readAllFromRPC } from "@staratlas/data-source";
import {
	Cause,
	Effect,
	Array as EffectArray,
	Exit,
	LogLevel,
	Logger,
	ManagedRuntime,
	Option,
} from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { SolanaService } from "~/core/services/SolanaService";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createMainLiveService";

type Param = {
	globalOpts: GlobalOptionsWithWebhook;
};

export const runRecipeList = async ({ globalOpts }: Param) => {
	const mainServiceLive = createMainLiveService(globalOpts);

	const runtime = ManagedRuntime.make(mainServiceLive);

	const program = GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.tap(() => Effect.log("Game initialized.")),
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
		Logger.withMinimumLogLevel(LogLevel.Debug),
	);

	const exit = await runtime.runPromiseExit(program);

	await runtime.dispose();

	exit.pipe(
		Exit.match({
			onSuccess: () => {
				process.exit(0);
			},
			onFailure: (cause) => {
				console.log(`Transaction error: ${Cause.pretty(cause)}`);

				const error = Cause.failureOption(cause).pipe(Option.getOrUndefined);

				if (error) {
					console.log(error);
				}

				process.exit(1);
			},
		}),
	);
};
