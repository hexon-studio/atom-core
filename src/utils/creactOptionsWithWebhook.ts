import type { GlobalOptions, GlobalOptionsWithWebhook } from "../types";

export const creactOptionsWithWebhook = (
	globalOps: GlobalOptions,
): GlobalOptionsWithWebhook => {
	const { webhookSecret, webhookUrl, taskId, ...rest } = globalOps;

	return {
		...rest,
		webhookArgs:
			webhookSecret && webhookUrl && taskId
				? {
						webhookSecret,
						webhookUrl,
						taskId,
					}
				: undefined,
	};
};
