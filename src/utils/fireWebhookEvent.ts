import { Effect } from "effect";
import { constNull } from "effect/Function";
import {
	type WebhookEvent,
	WebhookService,
} from "../core/services/WebhookService";

export const fireWebhookEvent = <A>(event: WebhookEvent<A>) =>
	Effect.serviceOptional(WebhookService).pipe(
		Effect.tap(() =>
			Effect.log(`[WebhookService] Firing "${event.type}" event`).pipe(
				Effect.annotateLogs({ event }),
			),
		),
		Effect.flatMap((service) => service.fireWebhookEvent(event)),
		Effect.orElseSucceed(constNull),
	);
