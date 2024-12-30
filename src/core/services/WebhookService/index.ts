import { Context, Data, Effect, Layer } from "effect";
import type { WebhookOptions } from "../../../types";
import { getGameContext } from "../GameService/utils";

export type WebhookEvent =
	| {
			type: "start";
	  }
	| {
			type: "atlas-balance";
			payload: { balance: number };
	  }
	| {
			type: "success";
			payload: { signatures: string[]; removeCredit: boolean };
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

export class FireWebhookEventError extends Data.TaggedError(
	"FireWebhookEventError",
)<{ error: unknown }> {
	override get message() {
		return `Fail to fire webhook event: ${this.error}`;
	}
}

const fireWebhookEvent =
	({ taskId, webhookSecret, webhookUrl }: WebhookOptions) =>
	(event: WebhookEvent) =>
		getGameContext().pipe(
			Effect.flatMap(({ owner, playerProfile }) =>
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
									owner: owner.toString(),
									playerProfile: playerProfile.key.toString(),
									taskId,
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
