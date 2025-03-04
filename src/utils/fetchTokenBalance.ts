import type { Commitment, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { Effect } from "effect";
import { FetchTokenBalanceError } from "~/errors";
import { SolanaService } from "../core/services/SolanaService";

export const fetchTokenBalance = (
	tokenAccount: PublicKey,
	commitment: Commitment = "confirmed",
) =>
	SolanaService.anchorProvider.pipe(
		Effect.flatMap((provider) =>
			Effect.tryPromise({
				try: () =>
					provider.connection.getTokenAccountBalance(tokenAccount, commitment),
				catch: (error) => new FetchTokenBalanceError({ error }),
			}).pipe(
				Effect.map((data) =>
					data.value.uiAmount ? new BN(data.value.uiAmount) : new BN(0),
				),
			),
		),
	);
