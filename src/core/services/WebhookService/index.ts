import { Context, Data, Effect, Layer } from "effect";
import type { WebhookOptions } from "../../../types";

export type WebhookEvent =
	| {
			type: "start";
	  }
	| {
			type: "atlas-balance";
			payload: { balance: number };
	  }
	| {
			type: "remove-credit";
			payload: { owner: string };
	  }
	| {
			type: "success";
			payload: { signatures: string[] };
	  }
	| {
			type: "error";
			payload: {
				tag: string;
				message: string;
				signatures: string[];
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
		Effect.tryPromise({
			try: async (): Promise<{ success: boolean }> => {
				const response = await fetch(webhookUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: webhookSecret,
					},
					body: JSON.stringify({ ...event, taskId }),
				});

				if (!response.ok) {
					throw new Error(
						`Fail to send webhook event: ${event.type}, status: ${response.status}`,
					);
				}

				return response.json() as Promise<{ success: boolean }>;
			},
			catch: (error) => new FireWebhookEventError({ error }),
		});

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
