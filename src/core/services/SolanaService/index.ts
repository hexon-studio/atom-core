import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@staratlas/anchor";
import { Effect, Layer, Match } from "effect";
import type { GlobalOptions } from "../../../types";
import type { CreateAssociatedTokenAccountIdempotent } from "./createAssociatedTokenAccountIdempotent";
import { createAssociatedTokenAccountIdempotent } from "./createAssociatedTokenAccountIdempotent";
import type { GetParsedTokenAccountsByOwner } from "./getParsedTokenAccountsByOwner";
import { createGetParsedTokenAccountsByOwner } from "./getParsedTokenAccountsByOwner";

export class SolanaService extends Effect.Tag("app/SolanaService")<
	SolanaService,
	{
		signer: Keypair;
		anchorProvider: AnchorProvider;
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

export const createSolanaServiceLive = (opts: GlobalOptions) => {
	const keypair = Match.value(opts).pipe(
		Match.when({ kind: "exec" }, ({ keypair }) => keypair),
		Match.when({ kind: "query" }, () => Keypair.generate()),
		Match.exhaustive,
	);
	const anchorProvider = createAnchorProvider({ rpcUrl: opts.rpcUrl, keypair });

	return Layer.succeed(
		SolanaService,
		SolanaService.of({
			signer: keypair,
			anchorProvider,
			getParsedTokenAccountsByOwner: createGetParsedTokenAccountsByOwner(
				anchorProvider.connection,
			),
			createAssociatedTokenAccountIdempotent,
		}),
	);
};
