import type { Keypair, PublicKey } from "@solana/web3.js";

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

export type FeeMode = "low" | "medium" | "high";

export type RequiredOptions = {
	atlasPrime: boolean;
	maxIxsPerTransaction?: number;
	logDisabled?: boolean;
	feeMode: FeeMode;
	keypair: Keypair;
	owner: PublicKey;
	playerProfile: PublicKey;
	rpcUrl: string;
	feeLimit?: number;
	heliusRpcUrl?: string;
	feeUrl?: string;
};

export type CliGlobalOptions = RequiredOptions & {
	loggingToken?: string;
	contextId?: string;
	webhookSecret?: string;
	webhookUrl?: string;
};
