import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, type Keypair, type PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Context, Data, Effect, Layer } from "effect";

export class GetAssociatedTokenAddressError extends Data.TaggedError(
	"GetAssociatedTokenAddressError",
)<{
	readonly error: unknown;
}> {}

const getAssociatedTokenAddress = (
	mint: PublicKey,
	owner: PublicKey,
	allowOwnerOffCurve = false,
) =>
	Effect.try({
		try: () => getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve),
		catch: (error) => new GetAssociatedTokenAddressError({ error }),
	});

export class SolanaService extends Context.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
		getAssociatedTokenAddress: typeof getAssociatedTokenAddress;
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
			getAssociatedTokenAddress,
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
