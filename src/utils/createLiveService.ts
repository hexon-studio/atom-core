import { Layer } from "effect";
import { GameServiceLive } from "../core/services/GameService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import { createWebhookServiceLive } from "../core/services/WebhookService";
import type { GlobalOptionsWithWebhook } from "../types";

export const createMainLiveService = (opts: GlobalOptionsWithWebhook) => {
	const SolanaServiceLive = createSolanaServiceLive(opts);

	const WebhookServiceLive = opts.webhookArgs
		? createWebhookServiceLive(opts.webhookArgs)
		: Layer.empty;

	return Layer.mergeAll(
		SolanaServiceLive,
		WebhookServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
