import { Data } from "effect";
import { buildAndSignTransactionWithAtlasPrime } from "./buildAndSignTransactionWithAtlasPrime";
import { buildAndSignTransactionWithSol } from "./buildAndSignTransactionWithSol";

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

export const createBuildAndSignTransaction = (withAtlasPrime: boolean) =>
	withAtlasPrime
		? buildAndSignTransactionWithAtlasPrime
		: buildAndSignTransactionWithSol;

export type BuildAndSignTransaction = ReturnType<
	typeof createBuildAndSignTransaction
>;
