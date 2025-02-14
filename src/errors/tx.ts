import type { TransactionError } from "@solana/web3.js";
import { Data } from "effect";
import { z } from "zod";

export class BuildAndSignTransactionError extends Data.TaggedError(
	"BuildAndSignTransactionError",
)<{ error: unknown }> {
	override get message() {
		return String(this.error);
	}
}

export class BuildOptimalTxError extends Data.TaggedError(
	"BuildOptimalTxError",
)<{
	error: unknown;
}> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}

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
)<{ error: unknown }> {
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
