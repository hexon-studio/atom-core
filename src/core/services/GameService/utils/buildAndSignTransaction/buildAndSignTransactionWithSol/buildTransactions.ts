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
import { BuildAndSignTransactionError, BuildOptimalTxError } from "~/errors";
import { getGameContext } from "../..";
import { GameService } from "../../..";

export const buildTransactions = ({
	ixs,
	afterIxs: afterIxsParam = [],
	fixedLimit,
}: {
	ixs: Array<InstructionReturn>;
	afterIxs?: Array<InstructionReturn>;
	fixedLimit?: number;
}) =>
	Effect.all([
		getGameContext(),
		SolanaService.anchorProvider,
		GameService.signer,
	]).pipe(
		Effect.flatMap(([context, provider, feePayer]) =>
			Effect.tryPromise({
				try: async () => {
					if (context.options.kind !== "exec") {
						return [];
					}

					const options = context.options;

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
						getFee: Option.fromNullable(options.heliusRpcUrl).pipe(
							Option.map(
								(heliusRpcUrl) => async (writableAccounts: PublicKey[]) => {
									if (!heliusFee) {
										heliusFee = await getHeliusEstimatedTransactionFee({
											feeMode: options.feeMode,
											heliusRpcUrl,
											writableAccounts,
										});
									}

									const feeLimit = options.feeLimit;

									return feeLimit ? Math.min(heliusFee, feeLimit) : heliusFee;
								},
							),
							Option.getOrUndefined,
						),
						mapLimit: (num: number) => {
							return (
								fixedLimit ??
								num + Math.min(100_000, Math.max(10_000, num * 0.25))
							);
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
