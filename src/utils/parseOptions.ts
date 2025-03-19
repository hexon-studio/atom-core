import { InvalidOptionArgumentError } from "commander";
import { Boolean as EffectBoolean } from "effect";
import { type GlobalOptions, cliOptionsDecoder } from "../types";

export const parseOptions = (maybeGlobalOps: unknown): GlobalOptions => {
	const {
		webhookSecret,
		webhookUrl,
		contextId,
		feeLamports,
		feeRecipient,
		feeAtlas,
		...rest
	} = cliOptionsDecoder.parse(maybeGlobalOps);

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
