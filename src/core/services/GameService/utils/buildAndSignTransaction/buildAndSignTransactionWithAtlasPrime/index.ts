import type {
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { type Cause, Effect, Array as EffectArray } from "effect";
import type {
	CreateKeypairError,
	CreateProviderError,
	SolanaService,
} from "~/core/services/SolanaService";
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source";
import type { BuildAndSignTransactionError, BuildOptimalTxError } from "..";
import type { GameNotInitializedError } from "../..";
import type { GameService } from "../../..";
import { buildTransactions } from "./buildTransactions";

export const buildAndSignTransactionWithAtlasPrime: BuildAndSignTransactionWithAtlasPrime =
	({ ixs, afterIxs, size }) =>
		EffectArray.match(ixs, {
			onEmpty: () =>
				Effect.log("Skip building atlas prime ixs...").pipe(
					Effect.map(EffectArray.empty<TransactionReturn>),
				),
			onNonEmpty: (ixs) =>
				Effect.log("Building ixs with atlas prime...").pipe(
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

export type BuildAndSignTransactionWithAtlasPrime = (_: {
	ixs: Array<InstructionReturn>;
	afterIxs?: Array<InstructionReturn>;
	size: number;
}) => Effect.Effect<
	TransactionReturn[],
	| BuildAndSignTransactionError
	| BuildOptimalTxError
	| CreateKeypairError
	| ReadFromRPCError
	| GameNotInitializedError
	| CreateProviderError
	| Cause.TimeoutException,
	SolanaService | GameService
>;
