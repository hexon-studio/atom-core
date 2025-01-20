import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import type {
	AfterIx,
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { type Cause, Effect, Array as EffectArray, Option } from "effect";
import type { Result } from "neverthrow";
import { tokenMints } from "~/constants/tokens";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import {
	type GameNotInitializedError,
	getGameContext,
} from "~/core/services/GameService/utils";
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

export const buildAndSignTransactionWithAtlasPrime = ({
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
		getSagePrograms(),
		getGameContext(),
		SolanaService.helius,
		SolanaService.anchorProvider,
		GameService.signer,
	]).pipe(
		Effect.tap(() => Effect.log("Building ixs with atlas prime")),
		Effect.flatMap(([programs, context, helius, provider, signer]) =>
			Effect.tryPromise({
				try: async () => {
					const [vaultAuthority] = ProfileVault.findVaultSigner(
						programs.profileVaultProgram,
						context.playerProfile.key,
						context.owner,
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

					const builder = await AtlasPrimeTransactionBuilder.new({
						afpUrl: "https://prime.staratlas.com/",
						connection: provider.connection,
						commitment: "confirmed",
						lookupTables: lookupTable.value ? [lookupTable.value] : undefined,
						afterIxs,
						getFee: helius.pipe(
							Option.map(
								({ rpc: heliusRpcUrl, feeMode, feeLimit }) =>
									async (writableAccounts: PublicKey[]) => {
										if (!heliusFee) {
											heliusFee = await getHeliusEstimatedTransactionFee({
												heliusRpcUrl,
												writableAccounts,
												feeMode,
											});
										}

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

export type BuildAndSignTransactionWithAtlasPrime =
	typeof buildAndSignTransactionWithAtlasPrime;
