import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import type {
	AfterIx,
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { Effect, Array as EffectArray, Option } from "effect";
import type { Result } from "neverthrow";
import { tokenMints } from "~/constants/tokens";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { getHeliusEstimatedTransactionFee } from "~/core/utils/getHeliusEstimatedTransactionFee";
import { BuildAndSignTransactionError, BuildOptimalTxError } from "~/errors";

export const buildTransactions = ({
	ixs,
	afterIxs: afterIxsParam = [],
}: {
	ixs: Array<InstructionReturn>;
	afterIxs?: Array<InstructionReturn>;
}) =>
	Effect.all([
		getSagePrograms(),
		getGameContext(),
		SolanaService.anchorProvider,
		GameService.signer,
	]).pipe(
		Effect.flatMap(([programs, context, provider, signer]) =>
			Effect.tryPromise({
				try: async () => {
					if (context.options.kind !== "exec") {
						return [];
					}

					const options = context.options;

					const [vaultAuthority] = ProfileVault.findVaultSigner(
						programs.profileVaultProgram,
						context.playerProfile.key,
						options.owner,
					);

					const lookupTable = await provider.connection.getAddressLookupTable(
						// TODO: remove hardcode
						new PublicKey("5NrYTRkLRsSSJGgfX2vNRbSXiEFi9yUHV5n7bs7VM9P2"),
					);

					let heliusFee: number;

					const afterIxs: AfterIx[] = afterIxsParam.map((ix) => ({
						ix,
						computeEstimate: 5_000,
						maxTraceCount: 2,
					}));

					if (!options.afpUrl) {
						throw new BuildAndSignTransactionError({
							error: "AFP URL is required for Atlas Prime transactions",
						});
					}

					const builder = await AtlasPrimeTransactionBuilder.new({
						afpUrl: options.afpUrl,
						connection: provider.connection,
						commitment: "confirmed",
						lookupTables: lookupTable.value ? [lookupTable.value] : undefined,
						afterIxs,
						getFee: Option.fromNullable(options.heliusRpcUrl).pipe(
							Option.map(
								(heliusRpcUrl) => async (writableAccounts: PublicKey[]) => {
									if (!heliusFee) {
										heliusFee = await getHeliusEstimatedTransactionFee({
											heliusRpcUrl,
											writableAccounts,
											feeMode: options.feeMode,
										});
									}

									const feeLimit = options.feeLimit;

									return feeLimit ? Math.min(heliusFee, feeLimit) : heliusFee;
								},
							),
							Option.getOrUndefined,
						),
						postArgs: {
							vault: {
								funderVaultAuthority: vaultAuthority,
								funderVault: getAssociatedTokenAddressSync(
									tokenMints.atlas,
									vaultAuthority,
									true,
								),
								keyInput: {
									key: signer,
									profile: context.playerProfile,
									playerProfileProgram: programs.playerProfile,
								},
								vaultProgram: programs.profileVaultProgram,
							},
						},
						program: programs.atlasPrime,
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
