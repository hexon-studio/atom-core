import { Effect, LogLevel, Logger } from "effect";
import { GameService } from "../core/services/GameService";
import { getGameContext } from "../core/services/GameService/utils";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

export const runProfileInfo = async (globalOpts: GlobalOptions) =>
	makeAtomCommand(() =>
		GameService.pipe(
			Effect.tap((service) =>
				service.initGame(service.gameContext, globalOpts),
			),
			Effect.tap(() => Effect.log("Game initialized.")),
			Effect.flatMap(getGameContext),
			Effect.map((context) => context.playerProfile),
			Effect.tap((profile) =>
				Effect.log("Profile fetched.").pipe(Effect.annotateLogs({ profile })),
			),
			Logger.withMinimumLogLevel(LogLevel.Debug),
		),
	)(globalOpts);
