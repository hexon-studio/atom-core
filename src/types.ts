import { Keypair, PublicKey } from "@solana/web3.js";
import { z } from "zod";

export type WebhookOptions = Required<
	Pick<CliGlobalOptions, "webhookSecret" | "webhookUrl">
> &
	Pick<CliGlobalOptions, "contextId">;

export type GlobalOptionsWithWebhook = Omit<
	CliGlobalOptions,
	"webhookSecret" | "webhookUrl" | "contextId"
> & {
	webhookArgs?: WebhookOptions;
};

export const requiredOptionsDecoder = z.object({
	atlasPrime: z.boolean(),
	feeMode: z.union([z.literal("low"), z.literal("medium"), z.literal("high")]),
	keypair: z.instanceof(Keypair),
	maxIxsPerTransaction: z.string().transform(Number),
	owner: z.instanceof(PublicKey),
	playerProfile: z.instanceof(PublicKey),
	rpcUrl: z.string(),

	// Optinal fields
	feeLimit: z.number().optional(),
	feeUrl: z.string().optional(),
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
});

export type CliGlobalOptions = z.infer<typeof cliOptionsDecoder>;
