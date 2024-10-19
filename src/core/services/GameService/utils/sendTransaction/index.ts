import type { SendOptions } from "@solana/web3.js";
import {
	type TransactionReturn,
	sendTransaction as sageSendTransaction,
} from "@staratlas/data-source";
import { Console, Data, Effect } from "effect";
import { SolanaService } from "../../../SolanaService";

export class SendTransactionError extends Data.TaggedError(
	"SendTransactionError",
)<{
	readonly error: unknown;
}> {}

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
						Effect.tryPromise({
							try: () =>
								sageSendTransaction(tx, provider.connection, {
									commitment: "confirmed",
									sendOptions,
								}),
							catch: (error) => new SendTransactionError({ error }),
						}),
					),
					Effect.flatMap((result) =>
						result.value.isOk()
							? Effect.succeed(result.value.value)
							: Effect.fail(
									new SendTransactionError({ error: result.value.error }),
								),
					),
				),
				{ times: 5 },
			),
		),
	);

export type SendTransaction = typeof sendTransaction;
