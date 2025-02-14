import { buildAndSignTransactionWithAtlasPrime } from "./buildAndSignTransactionWithAtlasPrime";
import { buildAndSignTransactionWithSol } from "./buildAndSignTransactionWithSol";

export const createBuildAndSignTransaction = (withAtlasPrime: boolean) =>
	withAtlasPrime
		? buildAndSignTransactionWithAtlasPrime
		: buildAndSignTransactionWithSol;

export type BuildAndSignTransaction = ReturnType<
	typeof createBuildAndSignTransaction
>;
