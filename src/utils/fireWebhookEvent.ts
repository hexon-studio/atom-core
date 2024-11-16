import { Console, Effect } from "effect";
import { constNull } from "effect/Function";
import {
	type WebhookEvent,
	WebhookService,
} from "../core/services/WebhookService";

export const fireWebhookEvent = (param: WebhookEvent) =>
	Effect.serviceOptional(WebhookService).pipe(
		Effect.tapError(() => Console.log("WebhookService not found, skipping")),
		Effect.flatMap((service) => service.fireWebhookEvent(param)),
		Effect.orElseSucceed(constNull),
	);
