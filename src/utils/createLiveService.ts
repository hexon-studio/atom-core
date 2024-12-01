import { Layer } from "effect";
import { GameServiceLive } from "../core/services/GameService";
import { createLoggerServiceLive } from "../core/services/LoggerService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import { createWebhookServiceLive } from "../core/services/WebhookService";
import type { GlobalOptionsWithWebhook } from "../types";

export const createMainLiveService = (opts: GlobalOptionsWithWebhook) => {
	const SolanaServiceLive = createSolanaServiceLive(opts);

	const WebhookServiceLive = opts.webhookArgs
		? createWebhookServiceLive(opts.webhookArgs)
		: Layer.empty;

	const LoggerServiceLive = createLoggerServiceLive(opts);

	return Layer.mergeAll(
		SolanaServiceLive,
		WebhookServiceLive,
		LoggerServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
