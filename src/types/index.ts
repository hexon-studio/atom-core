import { Keypair, PublicKey } from "@solana/web3.js";
import { z } from "zod";

export type WebhookOptions = Required<
	Pick<CliExecGlobalOptions, "webhookSecret" | "webhookUrl">
> &
	Pick<CliExecGlobalOptions, "contextId">;

export type AtomExecOptions = Omit<
	CliExecGlobalOptions,
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

export const queryOptionsDecoder = z.object({
	kind: z.literal("query"),
	commonApiUrl: z.string().optional(),
	rpcUrl: z.string(),
	playerProfile: z.instanceof(PublicKey),

	loggingToken: z.string().optional(),
});

export type QueryOptions = z.infer<typeof queryOptionsDecoder>;

export type GlobalOptions = QueryOptions | AtomExecOptions;

export const requiredExecOptionsDecoder = queryOptionsDecoder.extend({
	kind: z.literal("exec"),
	atlasPrime: z.boolean().default(false),
	keypair: z.instanceof(Keypair),
	maxIxsPerTransaction: z.string().transform(Number),
	owner: z.instanceof(PublicKey),
	feeMode: z.union([z.literal("low"), z.literal("medium"), z.literal("high")]),

	// Optinal fields
	afpUrl: z.string().optional(),
	feeAtlas: z.number().optional(),
	feeLamports: z.number().optional(),
	feeRecipient: z.instanceof(PublicKey).optional(),
	feeLimit: z.number().optional(),
	heliusRpcUrl: z.string().optional(),
	logDisabled: z.boolean().optional(),
});

export type RequiredOptions = z.infer<typeof requiredExecOptionsDecoder>;

export type FeeMode = RequiredOptions["feeMode"];

export const cliOptionsDecoder = requiredExecOptionsDecoder.extend({
	contextId: z.string().optional(),

	webhookSecret: z.string().optional(),
	webhookUrl: z.string().optional(),
	trackingAddress: z.instanceof(PublicKey).optional(),
});

export type CliExecGlobalOptions = z.infer<typeof cliOptionsDecoder>;
