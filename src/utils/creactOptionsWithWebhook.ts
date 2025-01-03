import { InvalidOptionArgumentError } from "commander";
import type { CliGlobalOptions, GlobalOptionsWithWebhook } from "../types";

export const createOptionsWithWebhook = (
	globalOps: CliGlobalOptions,
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
