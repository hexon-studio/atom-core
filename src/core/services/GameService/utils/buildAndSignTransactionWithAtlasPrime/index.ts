import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import type {
	AfterIx,
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { Data, Effect, Array as EffectArray, Option } from "effect";
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
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source";
import { getHeliusEstimatedTransactionFee } from "./getHeliusEstimatedTransactionFee";

export class BuildAndSignTransactionWithAtlasPrimeError extends Data.TaggedError(
	"BuildAndSignTransactionWithAtlasPrimeError",
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

export const buildAndSignTransactionWithAtlasPrime = (
	mainInstructions: Array<InstructionReturn>,
	afterMainInstructions: Array<InstructionReturn> = [],
): Effect.Effect<
	TransactionReturn[],
	| BuildAndSignTransactionWithAtlasPrimeError
	| BuildOptimalTxError
	| CreateKeypairError
	| ReadFromRPCError
	| GameNotInitializedError
	| CreateProviderError,
	SolanaService | GameService
> =>
	Effect.all([SolanaService, GameService]).pipe(
		Effect.flatMap(([solanaService, gameService]) =>
			Effect.all([
				getSagePrograms(),
				solanaService.helius,
				solanaService.secondaryAnchorProvider,
				gameService.signer,
				getGameContext(),
			]),
		),
		Effect.tap(() => Effect.log("Building ixs")),
		Effect.flatMap(([programs, helius, provider, signer, context]) =>
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

					const afterIxs: AfterIx[] = afterMainInstructions.map((ix) => ({
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

					builder.add(mainInstructions);

					// const ixSign = (
					// 	await Promise.all(builder.instructions.map((ix) => ix(signer)))
					// ).flat();
					// const tmp = getTransactionSize(
					// 	ixSign,
					// 	signer.publicKey(),
					// 	buildLookupTableSet(builder.lookupTables),
					// );
					// console.log("size", tmp.size);

					const txs: Result<TransactionReturn, string>[] = [];

					// let i = 0;
					// for await (let tx of builder.optimalTransactions()) {
					// 	tx = await builder.rebuildLast(false);
					// 	if (tx.isErr()) {
					// 		throw new BuildOptimalTxError({ error: tx.error });
					// 	}
					// 	if (i > 100) {
					// 		throw new BuildOptimalTxError({ error: "Too many iterations" });
					// 	}
					// 	txs.push(tx);
					// 	i++;
					// }

					const generator = builder.optimalTransactions();

					let i = 0;
					while (true) {
						if (i > 100) {
							throw new BuildOptimalTxError({ error: "Too many iterations" });
						}

						const { value, done } = await generator.next();
						if (done) break;

						const tx = value;
						if (tx.isErr()) {
							throw new BuildOptimalTxError({ error: tx.error });
						}

						txs.push(tx);
						i++;
					}

					return txs;
				},
				catch: (error) =>
					new BuildAndSignTransactionWithAtlasPrimeError({
						error,
					}),
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

export type BuildAndSignTransactionWithAtlasPrime =
	typeof buildAndSignTransactionWithAtlasPrime;
