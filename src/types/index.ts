import { Keypair, PublicKey } from "@solana/web3.js";
import { z } from "zod";

export type WebhookOptions = Required<
	Pick<CliGlobalOptions, "webhookSecret" | "webhookUrl">
> &
	Pick<CliGlobalOptions, "contextId">;

export type GlobalOptions = Omit<
	CliGlobalOptions,
	| "feeAtlas"
	| "feeLamports"
	| "feeRecipient"
	| "webhookSecret"
	| "webhookUrl"
	| "contextId"
> & {
	fees?:
		| {
				type: "atlas-prime";
				atlas: number;
				recipient: PublicKey;
		  }
		| {
				type: "sol";
				lamports: number;
				recipient: PublicKey;
		  };
	webhookArgs?: WebhookOptions;
};

export const requiredOptionsDecoder = z.object({
	atlasPrime: z.boolean().default(false),
	keypair: z.instanceof(Keypair),
	maxIxsPerTransaction: z.string().transform(Number),
	owner: z.instanceof(PublicKey),
	playerProfile: z.instanceof(PublicKey),
	rpcUrl: z.string(),

	feeMode: z.union([z.literal("low"), z.literal("medium"), z.literal("high")]),

	// Optinal fields
	feeAtlas: z.number().optional(),
	feeLamports: z.number().optional(),
	feeRecipient: z.instanceof(PublicKey).optional(),
	commonApiUrl: z.string().optional(),
	feeLimit: z.number().optional(),
	heliusRpcUrl: z.string().optional(),
	logDisabled: z.boolean().optional(),
});

export type RequiredOptions = z.infer<typeof requiredOptionsDecoder>;

export type FeeMode = RequiredOptions["feeMode"];

export const cliOptionsDecoder = requiredOptionsDecoder.extend({
	contextId: z.string().optional(),
	loggingToken: z.string().optional(),
	webhookSecret: z.string().optional(),
	webhookUrl: z.string().optional(),
	trackingAddress: z.instanceof(PublicKey).optional(),
});

export type CliGlobalOptions = z.infer<typeof cliOptionsDecoder>;
