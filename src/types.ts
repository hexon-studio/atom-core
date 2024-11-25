import type { Keypair, PublicKey } from "@solana/web3.js";

export type WebhookOptions = Required<
	Pick<GlobalOptions, "webhookSecret" | "webhookUrl" | "taskId">
>;

export type GlobalOptionsWithWebhook = Omit<
	GlobalOptions,
	"webhookSecret" | "webhookUrl" | "taskId"
> & {
	webhookArgs?: WebhookOptions;
};

export type FeeMode = "low" | "medium" | "high";

export type GlobalOptions = {
	keypair: Keypair;
	owner: PublicKey;
	playerProfile: PublicKey;
	rpcUrl: string;
	feeUrl?: string;
	secondaryRpcUrl?: string;
	heliusRpcUrl?: string;
	feeMode: FeeMode;
	webhookSecret?: string;
	webhookUrl?: string;
	taskId?: string;
	verbose: boolean;
};
