import { Connection, type Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Context, Data, Effect, Layer } from "effect";

export class SolanaService extends Context.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
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
}: {
	keypair: Keypair;
	rpcUrl: string;
}) =>
	Layer.succeed(
		SolanaService,
		SolanaService.of({
			signer: keypair,
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
