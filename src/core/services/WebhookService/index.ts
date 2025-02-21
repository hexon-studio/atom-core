import { Context, Effect, Layer } from "effect";
import { FireWebhookEventError } from "~/errors";
import type { WebhookOptions } from "~/utils/parseOptionsWebhook";
import { getGameContext } from "../GameService/utils";

export type WebhookEvent<A> =
	| {
			type: "start";
	  }
	| {
			type: "success";
			payload: A;
	  }
	| {
			type: "error";
			payload: {
				tag: string;
				message: string;
				signatures: string[];
				context?: Record<string, unknown>;
			};
	  };

const fireWebhookEvent =
	({ contextId, webhookSecret, webhookUrl }: WebhookOptions) =>
	<A>(event: WebhookEvent<A>) =>
		getGameContext().pipe(
			Effect.flatMap(({ options, playerProfile }) =>
				Effect.retry(
					Effect.tryPromise({
						try: async (): Promise<{ success: boolean }> => {
							const response = await fetch(webhookUrl, {
								signal: AbortSignal.timeout(10_000),
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: webhookSecret,
								},
								body: JSON.stringify({
									...event,
									owner: options.owner.toString(),
									playerProfile: playerProfile.key.toString(),
									contextId,
								}),
							});

							if (!response.ok) {
								throw new Error(
									`Fail to send webhook event: ${event.type}, status: ${response.status}`,
								);
							}

							return response.json() as Promise<{ success: boolean }>;
						},
						catch: (error) => new FireWebhookEventError({ error }),
					}),
					{ times: 3 },
				),
			),
		);

export class WebhookService extends Context.Tag("app/WebhookService")<
	WebhookService,
	{
		fireWebhookEvent: ReturnType<typeof fireWebhookEvent>;
	}
>() {}

export const createWebhookServiceLive = (opts: WebhookOptions) =>
	Layer.succeed(
		WebhookService,
		WebhookService.of({
			fireWebhookEvent: fireWebhookEvent(opts),
		}),
	);
