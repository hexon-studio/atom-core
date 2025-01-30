import { PublicKey } from "@solana/web3.js";
import {
	type AfterIx,
	type InstructionReturn,
	TransactionBuilder,
	type TransactionReturn,
} from "@staratlas/data-source";
import { Effect, Array as EffectArray, Option } from "effect";
import type { Result } from "neverthrow";
import { SolanaService } from "~/core/services/SolanaService";
import { getHeliusEstimatedTransactionFee } from "~/core/utils/getHeliusEstimatedTransactionFee";
import { BuildAndSignTransactionError, BuildOptimalTxError } from "..";
import { GameService } from "../../..";

export const buildTransactions = ({
	ixs,
	afterIxs: afterIxsParam = [],
}: { ixs: Array<InstructionReturn>; afterIxs?: Array<InstructionReturn> }) =>
	Effect.all([
		SolanaService.helius,
		SolanaService.anchorProvider,
		GameService.signer,
	]).pipe(
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
						mapLimit: (num: number) => {
							return num + Math.min(100_000, Math.max(10_000, num * 0.1));
						},
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
