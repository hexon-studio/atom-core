import type { Connection, VersionedTransaction } from "@solana/web3.js";
import {
	type SendTransactionOptions,
	type TransactionReturn,
	isVersionedTransaction,
	verifySignatures,
} from "@staratlas/data-source";
import { Effect } from "effect";
import {
	ConfirmTransactionError,
	SendRawTransactionError,
	TransactionFailedError,
	VerifySignaturesError,
} from "~/errors";

export const customSageSendTransaction = (
	transaction: TransactionReturn<VersionedTransaction>,
	connection: Connection,
	options?: SendTransactionOptions,
) =>
	Effect.gen(function* () {
		const rawTransaction = transaction.transaction.serialize();

		if (isVersionedTransaction(transaction.transaction)) {
			yield* Effect.try({
				try: () => verifySignatures(transaction.transaction),
				catch: (error) => new VerifySignaturesError({ error }),
			});
		}

		const commitment = options?.commitment || "confirmed";

		// const sim = yield* Effect.tryPromise(() =>
		// 	connection.simulateTransaction(transaction.transaction),
		// );

		// console.log("Simulated transaction", sim.value);

		const signature = yield* Effect.log("Sending transaction").pipe(
			Effect.flatMap(() =>
				Effect.tryPromise({
					try: () =>
						connection.sendRawTransaction(rawTransaction, options?.sendOptions),
					catch: (error) => new SendRawTransactionError({ error }),
				}),
			),
			Effect.retry({ times: 5 }),
		);

		const result = yield* Effect.tryPromise({
			try: () =>
				connection.confirmTransaction(
					{ signature, ...transaction.rbh },
					commitment,
				),
			catch: (error) => new ConfirmTransactionError({ error }),
		}).pipe(Effect.retry({ times: 5 }));

		if (result.value.err !== null) {
			return yield* Effect.fail(
				new TransactionFailedError({ error: result.value.err, signature }),
			);
		}

		yield* Effect.log("Transaction confirmed.");

		return { context: result.context, signature };
	});
