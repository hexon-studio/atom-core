import { Option, Redacted } from "effect";
import type { GlobalOptions } from "./globalOptions";

export type WebhookOptions = {
	contextId?: string;
	webhookSecret: string;
	webhookUrl: string;
};

export const parseOptionsWebhook = ({
	webhookSecret,
	webhookUrl,
	contextId,
}: Pick<
	GlobalOptions,
	"webhookSecret" | "webhookUrl" | "contextId"
>): Option.Option<WebhookOptions> =>
	Option.all([webhookSecret, webhookUrl]).pipe(
		Option.map(([webhookSecret, webhookUrl]) => ({
			webhookSecret: Redacted.value(webhookSecret),
			webhookUrl,
			contextId: Option.getOrUndefined(contextId),
		})),
	);
