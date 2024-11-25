import { InvalidOptionArgumentError } from "commander";
import type { GlobalOptions, GlobalOptionsWithWebhook } from "../types";

export const createOptionsWithWebhook = (
	globalOps: GlobalOptions,
): GlobalOptionsWithWebhook => {
	const { webhookSecret, webhookUrl, taskId, ...rest } = globalOps;

	if (rest.heliusRpcUrl) {
		const isHeliusRpc = rest.heliusRpcUrl.includes("helius");

		if (!isHeliusRpc) {
			throw new InvalidOptionArgumentError("Invalid helius rpc supplied.");
		}
	}

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
