import type {
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { type Cause, Effect, Array as EffectArray } from "effect";
import type { GameService } from "~/core/services/GameService";
import type { SolanaService } from "~/core/services/SolanaService";
import type {
	BuildAndSignTransactionError,
	BuildOptimalTxError,
	GameNotInitializedError,
	ReadFromRPCError,
} from "~/errors";
import { buildTransactions } from "./buildTransactions";

export const buildAndSignTransactionWithSol: BuildAndSignTransactionWithSol = ({
	ixs,
	afterIxs,
	size,
}) =>
	EffectArray.match(ixs, {
		onEmpty: () =>
			Effect.log("Skip building ixs...").pipe(
				Effect.map(EffectArray.empty<TransactionReturn>),
			),
		onNonEmpty: (ixs) =>
			Effect.log("Building ixs...").pipe(
				Effect.map(() => EffectArray.chunksOf(ixs, size)),
				Effect.map((chunks) =>
					EffectArray.map(chunks, (ixs) =>
						buildTransactions({
							ixs,
							afterIxs,
						}).pipe(Effect.timeout("30 seconds")),
					),
				),
				Effect.flatMap(Effect.all),
				Effect.map(EffectArray.flatten),
			),
	});

export type BuildAndSignTransactionWithSol = (_: {
	ixs: Array<InstructionReturn>;
	afterIxs?: Array<InstructionReturn>;
	size: number;
}) => Effect.Effect<
	TransactionReturn[],
	| BuildAndSignTransactionError
	| BuildOptimalTxError
	| ReadFromRPCError
	| GameNotInitializedError
	| Cause.TimeoutException,
	SolanaService | GameService
>;
