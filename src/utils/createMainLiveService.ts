import { Layer, Option } from "effect";
import { createGameServiceLive } from "../core/services/GameService";
import { createLoggerServiceLive } from "../core/services/LoggerService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import { createWebhookServiceLive } from "../core/services/WebhookService";
import type { GlobalOptions } from "./globalOptions";
import { parseOptionsWebhook } from "./parseOptionsWebhook";

export const createMainLiveService = (opts: GlobalOptions) => {
	const SolanaServiceLive = createSolanaServiceLive(opts);

	const webhookArgs = parseOptionsWebhook(opts);

	const WebhookServiceLive = Option.isSome(webhookArgs)
		? createWebhookServiceLive(webhookArgs.value)
		: Layer.empty;

	const LoggerServiceLive = createLoggerServiceLive(opts);

	const GameServiceLive = createGameServiceLive(opts.atlasPrime);

	return Layer.mergeAll(
		SolanaServiceLive,
		WebhookServiceLive,
		LoggerServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
