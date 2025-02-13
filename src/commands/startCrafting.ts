import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import {
	Cause,
	Effect,
	Exit,
	LogLevel,
	Logger,
	ManagedRuntime,
	Option,
} from "effect";
import { startCrafting } from "~/core/actions/startCrafting";
import { GameService } from "../core/services/GameService";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createMainLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	crewAmount: number;
	quantity: number;
	recipe: PublicKey;
	starbaseCoords: [BN, BN];
	globalOpts: GlobalOptionsWithWebhook;
};

export const runStartCrafting = async ({
	crewAmount,
	quantity,
	recipe,
	starbaseCoords,
	globalOpts,
}: Param) => {
	const mainServiceLive = createMainLiveService(globalOpts);

	const runtime = ManagedRuntime.make(mainServiceLive);

	const program = GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					startCrafting({
						crewAmount,
						quantity,
						recipe,
						starbaseCoords,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					signatures:
						err._tag === "TransactionFailedError" ? err.signature : null,
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Start crafting done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
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
