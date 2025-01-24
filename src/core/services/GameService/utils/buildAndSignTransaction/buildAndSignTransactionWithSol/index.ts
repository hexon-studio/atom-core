import type {
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { type Cause, Effect, Array as EffectArray } from "effect";
import type { GameService } from "~/core/services/GameService";
import type { GameNotInitializedError } from "~/core/services/GameService/utils";
import type {
	CreateKeypairError,
	CreateProviderError,
	SolanaService,
} from "~/core/services/SolanaService";
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source";
import type {
	BuildAndSignTransactionError,
	BuildOptimalTxError,
} from "../../buildAndSignTransaction";
import { buildTransactions } from "./buildTransactions";

export const buildAndSignTransactionWithSol: BuildAndSignTransactionWithSol = ({
	ixs,
	afterIxs,
	size = 5,
}) =>
	Effect.log("Building ixs").pipe(
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
	);

export type BuildAndSignTransactionWithSol = (_: {
	ixs: Array<InstructionReturn>;
	afterIxs?: Array<InstructionReturn>;
	size?: number;
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
