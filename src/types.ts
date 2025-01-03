import type { Keypair, PublicKey } from "@solana/web3.js";

export type WebhookOptions = Required<
	Pick<CliGlobalOptions, "webhookSecret" | "webhookUrl" | "taskId">
>;

export type GlobalOptionsWithWebhook = Omit<
	CliGlobalOptions,
	"webhookSecret" | "webhookUrl" | "taskId"
> & {
	webhookArgs?: WebhookOptions;
};

export type FeeMode = "low" | "medium" | "high";

export type RequiredOptions = {
	logDisabled?: boolean;
	feeMode: FeeMode;
	keypair: Keypair;
	owner: PublicKey;
	playerProfile: PublicKey;
	rpcUrl: string;
	feeLimit?: number;
	heliusRpcUrl?: string;
};

export type CliGlobalOptions = RequiredOptions & {
	feeUrl?: string;
	loggingToken?: string;
	secondaryRpcUrl?: string;
	taskId?: string;
	webhookSecret?: string;
	webhookUrl?: string;
};
