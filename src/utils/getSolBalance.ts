import type { Commitment, PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { SolanaService } from "../core/services/SolanaService";

export const getSolBalance = (
	publicKey: PublicKey,
	commitment: Commitment = "confirmed",
) =>
	SolanaService.anchorProvider.pipe(
		Effect.flatMap((provider) =>
			Effect.tryPromise(() =>
				provider.connection.getBalance(publicKey, commitment),
			).pipe(Effect.orElseSucceed(() => 0)),
		),
	);
