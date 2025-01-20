import { PublicKey } from "@solana/web3.js";
import {
	type AfterIx,
	type InstructionReturn,
	TransactionBuilder,
	type TransactionReturn,
} from "@staratlas/data-source";
import { type Cause, Effect, Array as EffectArray, Option } from "effect";
import type { Result } from "neverthrow";
import { GameService } from "~/core/services/GameService";
import type { GameNotInitializedError } from "~/core/services/GameService/utils";
import {
	type CreateKeypairError,
	type CreateProviderError,
	SolanaService,
} from "~/core/services/SolanaService";
import { getHeliusEstimatedTransactionFee } from "~/core/utils/getHeliusEstimatedTransactionFee";
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source";
import {
	BuildAndSignTransactionError,
	BuildOptimalTxError,
} from "../../buildAndSignTransaction";

export const buildAndSignTransactionWithSol = ({
	ixs,
	afterIxs: afterIxsParam = [],
}: {
	ixs: Array<InstructionReturn>;
	afterIxs?: Array<InstructionReturn>;
}): Effect.Effect<
	TransactionReturn[],
	| BuildAndSignTransactionError
	| BuildOptimalTxError
	| CreateKeypairError
	| ReadFromRPCError
	| GameNotInitializedError
	| CreateProviderError
	| Cause.TimeoutException,
	SolanaService | GameService
> =>
	Effect.all([
		SolanaService.helius,
		SolanaService.anchorProvider,
		GameService.signer,
	]).pipe(
		Effect.tap(() => Effect.log("Building ixs")),
		Effect.flatMap(([helius, provider, feePayer]) =>
			Effect.tryPromise({
				try: async () => {
					const lookupTable = await provider.connection.getAddressLookupTable(
						// TODO: remove hardcode
						new PublicKey("5NrYTRkLRsSSJGgfX2vNRbSXiEFi9yUHV5n7bs7VM9P2"),
					);

					const afterIxs: AfterIx[] = afterIxsParam.map((ix) => ({
						ix,
						computeEstimate: 5_000,
						maxTraceCount: 2,
					}));

					let heliusFee: number;

					const builder = new TransactionBuilder({
						connection: provider.connection,
						commitment: "confirmed",
						feePayer,
						lookupTables: lookupTable.value ? [lookupTable.value] : undefined,
						afterIxs,
						getFee: helius.pipe(
							Option.map(
								({ rpc: heliusRpcUrl, feeMode, feeLimit }) =>
									async (writableAccounts: PublicKey[]) => {
										if (!heliusFee) {
											heliusFee = await getHeliusEstimatedTransactionFee({
												feeMode,
												heliusRpcUrl,
												writableAccounts,
											});
										}

										return feeLimit ? Math.min(heliusFee, feeLimit) : heliusFee;
									},
							),
							Option.getOrUndefined,
						),
					});

					builder.add(ixs);

					const txs: Result<TransactionReturn, string>[] = [];

					for await (const tx of builder.optimalTransactions()) {
						txs.push(tx);
					}

					return txs;
				},
				catch: (error) => new BuildAndSignTransactionError({ error }),
			}),
		),
		Effect.timeout("30 seconds"),
		Effect.flatMap((txs) =>
			Effect.all(
				EffectArray.map(txs, (result) =>
					result.isOk()
						? Effect.succeed(result.value)
						: Effect.fail(new BuildOptimalTxError({ error: result.error })),
				),
			),
		),
	);

export type BuildAndSignTransactionWithSol =
	typeof buildAndSignTransactionWithSol;
