import { Option } from "effect";
import type { WebhookOptions } from "~/types";
import type { GlobalOptions } from "./globalOptions";

export const parseOptionsWebhook = ({
	webhookSecret,
	webhookUrl,
	contextId,
}: GlobalOptions): Option.Option<WebhookOptions> =>
	Option.all([webhookSecret, webhookUrl]).pipe(
		Option.map(([webhookSecret, webhookUrl]) => ({
			webhookSecret,
			webhookUrl,
			contextId: Option.getOrUndefined(contextId),
		})),
	);
