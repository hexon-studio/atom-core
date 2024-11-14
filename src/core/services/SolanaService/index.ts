import { Connection, type Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Context, Data, Effect, Layer, type Option } from "effect";
import type { FeeMode, GlobalOptionsWithSupabase } from "../../../types";

export class SolanaService extends Context.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
		hellomoon: Effect.Effect<Option.Option<{ rpc: string; feeMode: FeeMode }>>;
		anchorProvider: Effect.Effect<
			AnchorProvider,
			CreateKeypairError | CreateProviderError
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

export const createSolanaServiceLive = ({
	keypair,
	rpcUrl,
	hellomoonRpc,
	feeMode,
}: GlobalOptionsWithSupabase) =>
	Layer.succeed(
		SolanaService,
		SolanaService.of({
			signer: keypair,
			hellomoon: Effect.fromNullable(hellomoonRpc).pipe(
				Effect.map((rpc) => ({ rpc, feeMode })),
				Effect.option,
			),
			anchorProvider: Effect.try({
				try: () =>
					new AnchorProvider(
						new Connection(rpcUrl, "confirmed"),
						new Wallet(keypair),
						AnchorProvider.defaultOptions(),
					),
				catch: (error) => new CreateProviderError({ error }),
			}),
		}),
	);
