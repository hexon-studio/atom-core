import { Keypair, PublicKey } from "@solana/web3.js";
import { z } from "zod";

export const queryOptionsDecoder = z.object({
	kind: z.literal("query"),
	commonApiUrl: z.string().optional(),
	rpcUrl: z.string(),
	playerProfile: z.instanceof(PublicKey),
	loggingToken: z.string().optional(),
});

export const execOptionsDecoder = queryOptionsDecoder.extend({
	kind: z.literal("exec"),

	keypair: z.instanceof(Keypair),
	owner: z.instanceof(PublicKey),

	// Optional fields
	maxIxsPerTransaction: z.coerce.number().default(5),
	atlasPrime: z.boolean().default(false),
	afpUrl: z.string().optional(),
	feeAtlas: z.number().optional(),
	feeLamports: z.number().optional(),
	feeLimit: z.number().optional(),
	feeMode: z
		.union([z.literal("low"), z.literal("medium"), z.literal("high")])
		.default("low"),
	feeRecipient: z.instanceof(PublicKey).optional(),
	heliusRpcUrl: z.string().optional(),

	contextId: z.string().optional(),
	webhookSecret: z.string().optional(),
	webhookUrl: z.string().optional(),

	trackingAddress: z.instanceof(PublicKey).optional(),
});

export type RawAtomExecOptions = z.infer<typeof execOptionsDecoder>;
export type RawAtomExecInput = z.input<typeof execOptionsDecoder>;

export type FeeMode = RawAtomExecOptions["feeMode"];

export type WebhookOptions = {
	webhookSecret: string;
	webhookUrl: string;
	contextId?: string;
};

export type AtomExecOptions = Omit<
	RawAtomExecOptions,
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
export type AtomExecInput = Omit<
	RawAtomExecInput,
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

export type AtomQueryOptions = z.infer<typeof queryOptionsDecoder>;

export type GlobalOptions = AtomQueryOptions | AtomExecOptions;

export type SdkOptions = Omit<AtomExecInput, "loggingToken" | "kind">;
