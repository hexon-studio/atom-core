import { InvalidOptionArgumentError } from "commander";
import { Boolean as EffectBoolean } from "effect";
import { type GlobalOptions, execOptionsDecoder } from "../types";

export const parseExecOptions = (maybeGlobalOps: unknown): GlobalOptions => {
	const {
		webhookSecret,
		webhookUrl,
		contextId,
		feeLamports,
		feeRecipient,
		feeAtlas,
		...rest
	} = execOptionsDecoder.parse(maybeGlobalOps);

	if (rest.heliusRpcUrl) {
		const isHeliusRpc = rest.heliusRpcUrl.includes("helius");

		if (!isHeliusRpc) {
			throw new InvalidOptionArgumentError("Invalid helius rpc supplied.");
		}
	}

	return {
		...rest,
		fees: EffectBoolean.match(rest.atlasPrime, {
			onFalse: () =>
				feeLamports && feeRecipient
					? {
							type: "sol",
							lamports: feeLamports,
							recipient: feeRecipient,
						}
					: undefined,
			onTrue: () =>
				feeAtlas && feeRecipient
					? {
							type: "atlas-prime",
							atlas: feeAtlas,
							recipient: feeRecipient,
						}
					: undefined,
		}),
		webhookArgs:
			webhookSecret && webhookUrl
				? { webhookSecret, webhookUrl, contextId }
				: undefined,
	};
};
