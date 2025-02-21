import { type Command, Options } from "@effect/cli";
import { Keypair, PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import { Config, Option, Redacted } from "effect";
import { feeModes } from "~/constants/fees";

const atlasPrime = Options.boolean("atlasPrime").pipe(
	Options.withDefault(false),
	Options.withDescription("Enable the use of Atlas Prime"),
);

const keypair = Options.redacted("keypair").pipe(
	Options.withAlias("k"),
	Options.withFallbackConfig(Config.redacted("ATOM_HOT_WALLET")),
	Options.map((value) => base58.decode(Redacted.value(value))),
	Options.map(Keypair.fromSecretKey),
	Options.withDescription("Hot wallet secret key in base58 format"),
);

const maxIxsPerTransaction = Options.integer("maxIxsPerTransaction").pipe(
	Options.withAlias("mipt"),
	Options.withDefault(5),
	Options.withDescription("Maximum number of instructions per transaction"),
);

const owner = Options.integer("owner").pipe(
	Options.withAlias("o"),
	Options.withFallbackConfig(Config.string("ATOM_OWNER")),
	Options.map((owner) => new PublicKey(owner)),
	Options.withDescription("The publicKey of the player's wallet"),
);

const playerProfile = Options.integer("playerProfile").pipe(
	Options.withAlias("p"),
	Options.withFallbackConfig(Config.string("ATOM_PLAYER_PROFILE")),
	Options.map((player) => new PublicKey(player)),
	Options.withDescription("The publicKey of the player profile"),
);

const rpcUrl = Options.text("rpcUrl").pipe(
	Options.withFallbackConfig(Config.string("ATOM_RPC_URL")),
	Options.withAlias("r"),
	Options.withDescription("Solana RPC endpoint URL"),
);

// Optionals

const webhookUrl = Options.text("webhookUrl").pipe(
	Options.optional,
	Options.withDescription("Webhook URL for notifications"),
);

const webhookSecret = Options.redacted("webhookSecret").pipe(
	Options.optional,
	Options.withDescription("Secret for webhook authentication"),
);

const contextId = Options.text("contextId").pipe(
	Options.optional,
	Options.withDescription(
		"Custom identifier passed to webhook calls for tracking",
	),
);

const feeLamports = Options.integer("feeLamports").pipe(
	Options.optional,
	Options.withDescription("Core fee in lamports"),
);

const feeAtlas = Options.integer("feeAtlas").pipe(
	Options.optional,
	Options.withDescription("Core fee in ATLAS tokens"),
);

const feeRecipient = Options.text("feeRecipient").pipe(
	Options.map((feeRecipient) => new PublicKey(feeRecipient)),
	Options.optional,
	Options.withDescription("Public key of the fee recipient"),
);

const heliusRpcUrl = Options.text("heliusRpcUrl").pipe(
	Options.withFallbackConfig(Config.string("ATOM_HELIUS_RPC_URL")),
	Options.optional,
	Options.withDescription("Helius RPC URL for priority fee calculations"),
);

const feeMode = Options.choice("feeMode", feeModes).pipe(
	Options.withDefault("low"),
	Options.withDescription("Priority fee level for Helius RPC"),
);

const feeLimit = Options.integer("feeLimit").pipe(
	Options.optional,
	Options.withDescription("Maximum priority fee per CU in microlamports"),
);

const loggingToken = Options.redacted("loggingToken").pipe(
	Options.optional,
	Options.withDescription("Authentication token for cloud logging service"),
);

const commonApiUrl = Options.text("commonApiUrl").pipe(
	Options.withFallbackConfig(Config.string("ATOM_COMMON_API_URL")),
	Options.optional,
	Options.withDescription(
		"Cache API endpoint for game data (falls back to blockchain if not provided)",
	),
);

export const globalOptions = {
	atlasPrime,
	keypair,
	maxIxsPerTransaction,
	owner,
	playerProfile,
	rpcUrl,

	commonApiUrl,

	heliusRpcUrl,
	feeMode,

	feeRecipient,
	feeAtlas,
	feeLamports,
	feeLimit,

	webhookUrl,
	webhookSecret,
	contextId,

	loggingToken,
};

export type GlobalOptions = Command.Command.ParseConfig<typeof globalOptions>;

// export const parseOptions = (options: GlobalOptions) => {
// 	const {
// 		atlasPrime,
// 		feeAtlas,
// 		feeLamports,
// 		feeRecipient,
// 		webhookSecret,
// 		webhookUrl,
// 		contextId,
// 		commonApiUrl,
// 		feeLimit,
// 		heliusRpcUrl,
// 		loggingToken,
// 		...rest
// 	} = options;

// 	const fees = parseOptionsFees({
// 		atlasPrime,
// 		feeAtlas,
// 		feeLamports,
// 		feeRecipient,
// 	}).pipe(Option.getOrUndefined);

// 	const webhookArgs = parseOptionsWebhook({
// 		webhookSecret,
// 		webhookUrl,
// 		contextId,
// 	}).pipe(Option.getOrUndefined);

// 	return {
// 		...rest,
// 		atlasPrime,
// 		feeLimit: Option.getOrUndefined(feeLimit),
// 		heliusRpcUrl: Option.getOrUndefined(heliusRpcUrl),
// 		loggingToken: loggingToken.pipe(
// 			Option.map(Redacted.value),
// 			Option.getOrUndefined,
// 		),
// 		commonApiUrl: Option.getOrUndefined(commonApiUrl),
// 		fees,
// 		webhookArgs,
// 	};
// };

type UnwrapOption<T> = T extends Option.Option<infer U> ? U : T;
type UnwrapRedacted<T> = T extends Redacted.Redacted<infer U> ? U : T;

type KeysWithOption = {
	[K in keyof GlobalOptions]: GlobalOptions[K] extends Option.Option<unknown>
		? K
		: never;
}[keyof GlobalOptions];

export type ParsedGlobalOptions = Omit<GlobalOptions, KeysWithOption> & {
	[K in KeysWithOption]?: UnwrapRedacted<UnwrapOption<GlobalOptions[K]>>;
};

export const createOptionsFromParsed = ({
	commonApiUrl,
	feeLimit,
	heliusRpcUrl,
	loggingToken,
	contextId,
	feeAtlas,
	feeLamports,
	feeRecipient,
	webhookSecret,
	webhookUrl,
	...rest
}: ParsedGlobalOptions): GlobalOptions => ({
	...rest,
	commonApiUrl: Option.fromNullable(commonApiUrl),
	feeLimit: Option.fromNullable(feeLimit),
	contextId: Option.fromNullable(contextId),
	feeAtlas: Option.fromNullable(feeAtlas),
	feeLamports: Option.fromNullable(feeLamports),
	feeRecipient: Option.fromNullable(feeRecipient),
	heliusRpcUrl: Option.fromNullable(heliusRpcUrl),
	loggingToken: Option.fromNullable(loggingToken).pipe(
		Option.map(Redacted.make),
	),
	webhookSecret: Option.fromNullable(webhookSecret).pipe(
		Option.map(Redacted.make),
	),
	webhookUrl: Option.fromNullable(webhookUrl),
});
