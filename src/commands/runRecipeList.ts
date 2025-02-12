import { Recipe } from "@staratlas/crafting";
import { readAllFromRPC } from "@staratlas/data-source";
import { BN } from "bn.js";
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
import { resourceNameToMint } from "~/constants/resources";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { getCraftingFacilityAccount } from "~/libs/@staratlas/crafting/accounts";
import { divideRecipeIngredients } from "~/libs/@staratlas/crafting/utils";
import {
	findStarbasePdaByCoordinates,
	getStarbaseAccount,
} from "~/libs/@staratlas/sage";
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
				res.type === "ok" ? Option.some(res.data) : Option.none(),
			),
		),
		Effect.flatMap((recipes) =>
			Effect.gen(function* () {
				const context = yield* getGameContext();

				const [starbasePubkey] = yield* findStarbasePdaByCoordinates(
					context.gameInfo.game.key,
					[new BN(0), new BN(-39)],
				);

				const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

				const craftingFacility = yield* getCraftingFacilityAccount(
					starbaseAccount.data.craftingFacility,
				);

				return EffectArray.filter(recipes, (recipe) => {
					const {
						outputs: [output],
					} = divideRecipeIngredients(recipe);

					return (
						(output?.mint.equals(resourceNameToMint.Fuel) ?? false) &&
						craftingFacility.recipeCategories
							.map((pubkey) => pubkey.toBase58())
							.includes(recipe.data.category.toBase58())
					);
				});
			}),
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
