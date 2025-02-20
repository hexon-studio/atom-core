import { Connection, type Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Effect, Layer, Option } from "effect";
import type { FeeMode } from "~/constants/fees";
import type { GlobalOptions } from "~/utils/globalOptions";
import type { CreateAssociatedTokenAccountIdempotent } from "./createAssociatedTokenAccountIdempotent";
import { createAssociatedTokenAccountIdempotent } from "./createAssociatedTokenAccountIdempotent";
import type { GetParsedTokenAccountsByOwner } from "./getParsedTokenAccountsByOwner";
import { createGetParsedTokenAccountsByOwner } from "./getParsedTokenAccountsByOwner";

export class SolanaService extends Effect.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
		anchorProvider: AnchorProvider;
		helius: Effect.Effect<
			Option.Option<{ rpc: string; feeMode: FeeMode; feeLimit?: number }>
		>;

		getParsedTokenAccountsByOwner: GetParsedTokenAccountsByOwner;
		createAssociatedTokenAccountIdempotent: CreateAssociatedTokenAccountIdempotent;
	}
>() {}

const createAnchorProvider = ({
	rpcUrl,
	keypair,
}: { keypair: Keypair; rpcUrl: string }) =>
	new AnchorProvider(
		new Connection(rpcUrl, "confirmed"),
		new Wallet(keypair),
		AnchorProvider.defaultOptions(),
	);

export const createSolanaServiceLive = ({
	keypair,
	rpcUrl,
	heliusRpcUrl,
	feeMode,
	feeLimit,
}: GlobalOptions) => {
	const anchorProvider = createAnchorProvider({ rpcUrl, keypair });

	return Layer.succeed(
		SolanaService,
		SolanaService.of({
			signer: keypair,
			anchorProvider,
			helius: heliusRpcUrl.pipe(
				Effect.map((rpc) => ({
					rpc,
					feeMode,
					feeLimit: Option.getOrUndefined(feeLimit),
				})),
				Effect.option,
			),
			getParsedTokenAccountsByOwner: createGetParsedTokenAccountsByOwner(
				anchorProvider.connection,
			),
			createAssociatedTokenAccountIdempotent,
		}),
	);
};
