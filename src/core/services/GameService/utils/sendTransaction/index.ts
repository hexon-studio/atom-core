import type { TransactionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import { SolanaService } from "../../../SolanaService";
import { customSageSendTransaction } from "./customSageSendTransaction";

export const sendTransaction = (tx: TransactionReturn) =>
	SolanaService.anchorProvider.pipe(
		Effect.flatMap((provider) =>
			customSageSendTransaction(tx, provider.connection, {
				commitment: "confirmed",
				sendOptions: {
					skipPreflight: true,
					maxRetries: 0,
				},
			}),
		),
		Effect.map((tx) => tx.signature),
	);

export type SendTransaction = typeof sendTransaction;
