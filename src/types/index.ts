import type { Redacted } from "effect";

export type WebhookOptions = {
	contextId?: string;
	webhookSecret: Redacted.Redacted<string>;
	webhookUrl: string;
};
