import type { TransactionError } from "@solana/web3.js";
import {
	type AnyTransaction,
	type SendTransactionOptions,
	type TransactionReturn,
	type TransactionSender,
	isVersionedTransaction,
	verifySignatures,
} from "@staratlas/data-source";
import { Data, Effect } from "effect";

export class SendRawTransactionError extends Data.TaggedError(
	"SendRawTransactionError",
)<{ error: unknown }> {}

export class ConfirmTransactionError extends Data.TaggedError(
	"ConfirmTransactionError",
)<{ error: unknown }> {}

export class TransactionFailedError extends Data.TaggedError(
	"TransactionFailedError",
)<{ error: TransactionError; signature: string }> {}

export const customSageSendTransaction = (
	transaction: TransactionReturn<AnyTransaction>,
	connection: TransactionSender,
	options?: SendTransactionOptions,
) =>
	Effect.gen(function* () {
		const rawTransaction = transaction.transaction.serialize();

		if (isVersionedTransaction(transaction.transaction)) {
			yield* Effect.try(() => verifySignatures(transaction.transaction));
		}

		const commitment = options?.commitment || "confirmed";

		const signature = yield* Effect.tryPromise({
			try: () =>
				connection.sendRawTransaction(rawTransaction, options?.sendOptions),
			catch: (error) => new SendRawTransactionError({ error }),
		});

		const result = yield* Effect.tryPromise({
			try: () =>
				connection.confirmTransaction(
					{ signature, ...transaction.rbh },
					commitment,
				),
			catch: (error) => new ConfirmTransactionError({ error }),
		});

		if (result.value.err !== null) {
			return yield* Effect.fail(
				new TransactionFailedError({ error: result.value.err, signature }),
			);
		}

		return { context: result.context, signature };
	});
