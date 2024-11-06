import type { SendOptions } from "@solana/web3.js";
import type { TransactionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import { SolanaService } from "../../../SolanaService";
import { customSageSendTransaction } from "./customSageSendTransaction";

export const sendTransaction = (
	tx: TransactionReturn,
	sendOptions?: SendOptions,
) =>
	SolanaService.pipe(
		Effect.flatMap((solanaService) => solanaService.anchorProvider),
		Effect.flatMap((provider) =>
			customSageSendTransaction(tx, provider.connection, {
				commitment: "confirmed",
				sendOptions,
			}),
		),
		Effect.map((tx) => tx.signature),
	);

export type SendTransaction = typeof sendTransaction;
