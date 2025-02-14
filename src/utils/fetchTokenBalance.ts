import type { Commitment, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { Effect } from "effect";
import { SolanaService } from "../core/services/SolanaService";

export const fetchTokenBalance = (
	tokenAccount: PublicKey,
	commitment: Commitment = "confirmed",
) =>
	SolanaService.anchorProvider.pipe(
		Effect.flatMap((provider) =>
			Effect.tryPromise(() =>
				provider.connection.getTokenAccountBalance(tokenAccount, commitment),
			).pipe(
				Effect.map((data) =>
					data.value.uiAmount ? new BN(data.value.uiAmount) : new BN(0),
				),
				Effect.orElseSucceed(() => new BN(0)),
			),
		),
	);
