import type { SendOptions } from "@solana/web3.js";
import type { TransactionReturn } from "@staratlas/data-source";
import { Console, Effect } from "effect";
import { SolanaService } from "../../../SolanaService";
import { customSageSendTransaction } from "./customSageSendTransaction";

export const sendTransaction = (
	tx: TransactionReturn,
	sendOptions?: SendOptions,
) =>
	SolanaService.pipe(
		Effect.flatMap((solanaService) => solanaService.anchorProvider),
		Effect.flatMap((provider) =>
			Effect.retry(
				Console.log("Sending transaction").pipe(
					Effect.flatMap(() =>
						customSageSendTransaction(tx, provider.connection, {
							commitment: "confirmed",
							sendOptions,
						}),
					),
					Effect.map((tx) => tx.signature),
				),
				{ times: 5 },
			),
		),
	);

export type SendTransaction = typeof sendTransaction;
