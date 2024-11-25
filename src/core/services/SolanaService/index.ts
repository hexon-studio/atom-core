import { Connection, type Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Context, Data, Effect, Layer, Option } from "effect";
import type { FeeMode, GlobalOptionsWithWebhook } from "../../../types";

export class SolanaService extends Context.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
		anchorProvider: Effect.Effect<AnchorProvider, CreateProviderError>;
		secondaryAnchorProvider: Effect.Effect<AnchorProvider, CreateProviderError>;
		helius: Effect.Effect<Option.Option<{ rpc: string; feeMode: FeeMode }>>;
	}
>() {}

export class SecondaryRpcNotPassed extends Data.TaggedError(
	"SecondaryRpcNotPassed",
) {}
export class CreateKeypairError extends Data.TaggedError("CreateKeypairError")<{
	error: unknown;
}> {}

export class CreateProviderError extends Data.TaggedError(
	"CreateProviderError",
)<{
	error: unknown;
}> {}

const createAnchorProvider = ({
	rpcUrl,
	keypair,
}: { keypair: Keypair; rpcUrl: string }) =>
	Effect.try({
		try: () =>
			new AnchorProvider(
				new Connection(rpcUrl, "confirmed"),
				new Wallet(keypair),
				AnchorProvider.defaultOptions(),
			),
		catch: (error) => new CreateProviderError({ error }),
	});

export const createSolanaServiceLive = ({
	keypair,
	rpcUrl,
	secondaryRpcUrl,
	heliusRpcUrl,
	feeMode,
}: GlobalOptionsWithWebhook) =>
	Layer.succeed(
		SolanaService,
		SolanaService.of({
			signer: keypair,
			anchorProvider: createAnchorProvider({ rpcUrl, keypair }),
			secondaryAnchorProvider: Option.fromNullable(secondaryRpcUrl).pipe(
				Option.match({
					onNone: () => createAnchorProvider({ rpcUrl, keypair }),
					onSome: (secondaryRpcUrl) =>
						createAnchorProvider({ rpcUrl: secondaryRpcUrl, keypair }),
				}),
			),
			helius: Effect.fromNullable(heliusRpcUrl).pipe(
				Effect.map((rpc) => ({ rpc, feeMode })),
				Effect.option,
			),
		}),
	);
