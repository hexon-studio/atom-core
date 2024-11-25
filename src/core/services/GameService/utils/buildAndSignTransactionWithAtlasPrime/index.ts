import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import type {
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { Data, Effect, Array as EffectArray, Option } from "effect";
import type { Result } from "neverthrow";
import { type GameNotInitializedError, getGameContext } from "..";
import { GameService } from "../..";
import { tokenMints } from "../../../../../constants/tokens";
import type { FetchDummyKeysError } from "../../../../atlas-core-utils/dummy-keys";
import { SagePrograms } from "../../../../programs";
import type { ReadFromRPCError } from "../../../../utils/accounts";
import {
	type CreateKeypairError,
	type CreateProviderError,
	SolanaService,
} from "../../../SolanaService";
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
	instructions: Array<InstructionReturn>,
): Effect.Effect<
	TransactionReturn[],
	| BuildAndSignTransactionWithAtlasPrimeError
	| BuildOptimalTxError
	| FetchDummyKeysError
	| CreateKeypairError
	| ReadFromRPCError
	| GameNotInitializedError
	| CreateProviderError,
	SolanaService | GameService
> =>
	Effect.all([SolanaService, GameService]).pipe(
		Effect.flatMap(([solanaService, gameService]) =>
			Effect.all([
				SagePrograms,
				solanaService.helius,
				solanaService.secondaryAnchorProvider,
				gameService.signer,
				getGameContext(),
			]),
		),
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

					const builder = await AtlasPrimeTransactionBuilder.new({
						afpUrl: "https://prime.staratlas.com/",
						connection: provider.connection,
						commitment: "confirmed",
						lookupTables: lookupTable.value ? [lookupTable.value] : undefined,
						getFee: helius.pipe(
							Option.map(
								({ rpc: heliusRpcUrl, feeMode }) =>
									async (writableAccounts: PublicKey[]) => {
										const microLamports =
											await getHeliusEstimatedTransactionFee({
												heliusRpcUrl,
												writableAccounts,
												feeMode,
											});

										console.log({ microLamports });
										return microLamports;
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

					builder.add(instructions);

					const txs: Result<TransactionReturn, string>[] = [];

					for await (const tx of builder.optimalTransactions()) {
						txs.push(tx);
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
