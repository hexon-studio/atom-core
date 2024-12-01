import { Effect } from "effect";
import { constNull } from "effect/Function";
import {
	type WebhookEvent,
	WebhookService,
} from "../core/services/WebhookService";

export const fireWebhookEvent = (param: WebhookEvent) =>
	Effect.serviceOptional(WebhookService).pipe(
		Effect.tap(() => Effect.log(`Firing "${param.type}" event`)),
		Effect.flatMap((service) => service.fireWebhookEvent(param)),
		Effect.orElseSucceed(constNull),
	);
