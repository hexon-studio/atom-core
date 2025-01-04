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
import { z } from "zod";

export class SendRawTransactionError extends Data.TaggedError(
	"SendRawTransactionError",
)<{ error: unknown }> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}
export class VerifySignaturesError extends Data.TaggedError(
	"VerifySignaturesError",
)<{ error: unknown }> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}

export class ConfirmTransactionError extends Data.TaggedError(
	"ConfirmTransactionError",
)<{ error: unknown; signature: string }> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}

export class TransactionFailedError extends Data.TaggedError(
	"TransactionFailedError",
)<{ error: TransactionError; signature: string }> {
	override get message() {
		try {
			return JSON.stringify(
				z.record(z.string(), z.unknown()).parse(this.error),
			);
		} catch {
			return String(this.error);
		}
	}
}

export const customSageSendTransaction = (
	transaction: TransactionReturn<AnyTransaction>,
	connection: TransactionSender,
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
			catch: (error) => new ConfirmTransactionError({ error, signature }),
		}).pipe(Effect.retry({ times: 5 }));

		if (result.value.err !== null) {
			return yield* Effect.fail(
				new TransactionFailedError({ error: result.value.err, signature }),
			);
		}

		yield* Effect.log("Transaction confirmed.");

		return { context: result.context, signature };
	});
