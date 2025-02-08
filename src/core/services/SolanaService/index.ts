import { Connection, type Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Data, Effect, Layer, type Option } from "effect";
import type { FeeMode, GlobalOptions } from "../../../types";

export class SolanaService extends Effect.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
		anchorProvider: Effect.Effect<AnchorProvider, CreateProviderError>;
		helius: Effect.Effect<
			Option.Option<{ rpc: string; feeMode: FeeMode; feeLimit?: number }>
		>;
	}
>() {}

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
	heliusRpcUrl,
	feeMode,
	feeLimit,
}: GlobalOptions) =>
	Layer.succeed(
		SolanaService,
		SolanaService.of({
			signer: keypair,
			anchorProvider: createAnchorProvider({ rpcUrl, keypair }),
			helius: Effect.fromNullable(heliusRpcUrl).pipe(
				Effect.map((rpc) => ({ rpc, feeMode, feeLimit })),
				Effect.option,
			),
		}),
	);
