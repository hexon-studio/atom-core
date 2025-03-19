import { Layer, Logger, Match } from "effect";
import { createGameServiceLive } from "../core/services/GameService";
import { createLoggerServiceLive } from "../core/services/LoggerService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import { createWebhookServiceLive } from "../core/services/WebhookService";
import type { GlobalOptions } from "../types";

export const createMainLiveService = (
	opts: GlobalOptions,
	disableLogger = false,
) => {
	const SolanaServiceLive = createSolanaServiceLive(opts);

	const WebhookServiceLive =
		opts.kind === "exec" && opts.webhookArgs
			? createWebhookServiceLive(opts.webhookArgs)
			: Layer.empty;

	const LoggerServiceLive = Match.value(opts).pipe(
		Match.when({ kind: "query" }, () => Logger.remove(Logger.defaultLogger)),
		Match.when({ kind: "exec" }, (opts) =>
			disableLogger
				? Logger.remove(Logger.defaultLogger)
				: createLoggerServiceLive(opts),
		),
		Match.exhaustive,
	);

	const GameServiceLive = createGameServiceLive(
		opts.kind === "exec" ? opts.atlasPrime : false,
	);

	return Layer.mergeAll(
		SolanaServiceLive,
		WebhookServiceLive,
		LoggerServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
