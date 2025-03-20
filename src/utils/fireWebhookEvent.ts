import { Effect, Option } from "effect";
import { constVoid } from "effect/Function";
import {
	type WebhookEvent,
	WebhookService,
} from "../core/services/WebhookService";

export const fireWebhookEvent = <A>(event: WebhookEvent<A>) =>
	Effect.serviceOption(WebhookService).pipe(
		Effect.flatMap(
			Option.match({
				onSome: (service) =>
					service
						.fireWebhookEvent(event)
						.pipe(
							Effect.tap(() =>
								Effect.log(
									`[WebhookService] Firing "${event.type}" event`,
								).pipe(Effect.annotateLogs({ event })),
							),
						),
				onNone: () => Effect.void,
			}),
		),
		Effect.tapError((error) =>
			Effect.logError("[WebhookService] Error firing event").pipe(
				Effect.annotateLogs({ event, error }),
			),
		),
		Effect.orElseSucceed(constVoid),
	);
