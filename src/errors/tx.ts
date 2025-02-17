import type { TransactionError } from "@solana/web3.js";
import { Data } from "effect";
import { z } from "zod";

export class BuildAndSignTransactionError extends Data.TaggedError(
	"BuildAndSignTransactionError",
)<{ error: unknown }> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Unable to prepare transaction. ${errorMsg}`;
	}
}

export class BuildOptimalTxError extends Data.TaggedError(
	"BuildOptimalTxError",
)<{
	error: unknown;
}> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Unable to prepare transaction. ${errorMsg}`;
	}
}

export class SendRawTransactionError extends Data.TaggedError(
	"SendRawTransactionError",
)<{ error: unknown }> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Failed to send transaction to the network. ${errorMsg}`;
	}
}

export class VerifySignaturesError extends Data.TaggedError(
	"VerifySignaturesError",
)<{ error: unknown }> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Transaction signature verification failed. ${errorMsg}`;
	}
}

export class ConfirmTransactionError extends Data.TaggedError(
	"ConfirmTransactionError",
)<{ error: unknown }> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Transaction failed to confirm. The network may be congested. ${errorMsg}`;
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
			return `Transaction failed. ${this.error}`;
		}
	}
}
