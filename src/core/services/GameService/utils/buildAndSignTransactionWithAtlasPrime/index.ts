import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import type {
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { Array as EffectArray, Data, Effect } from "effect";
import { type GameNotInitializedError, getGameContext } from "..";
import { GameService } from "../..";
import { tokenMints } from "../../../../../constants/tokens";
import {
	type FetchDummyKeysError,
	fetchDummyKeys,
} from "../../../../atlas-core-utils/dummy-keys";
import { SagePrograms } from "../../../../programs";
import {
	type ReadFromRPCError,
	getPlayerProfileAccout,
} from "../../../../utils/accounts";
import {
	type CreateKeypairError,
	type CreateProviderError,
	SolanaService,
} from "../../../SolanaService";
import type { Result } from "neverthrow";

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
	error: string;
}> {
	override get message() {
		return this.error;
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
				solanaService.anchorProvider,
				gameService.signer,
				getGameContext(),
				fetchDummyKeys(),
			]),
		),
		Effect.flatMap(([programs, provider, signer, context, dummyKeys]) =>
			getPlayerProfileAccout(context.playerProfile).pipe(
				Effect.andThen((playerProfile) =>
					Effect.tryPromise({
						try: async () => {
							const [vaultAuthority] = ProfileVault.findVaultSigner(
								programs.profileVaultProgram,
								context.playerProfile,
								context.owner,
							);

							const builder = new AtlasPrimeTransactionBuilder({
								afpUrl: "https://prime.staratlas.com/",
								connection: provider.connection,
								commitment: "confirmed",
								dummyKeys,
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
											profile: playerProfile,
											playerProfileProgram: programs.playerProfile,
										},
										vaultProgram: programs.profileVaultProgram,
									},
								},
								program: programs.atlasPrime,
							});

							builder.add(instructions);

							const txs: Result<TransactionReturn, string>[] = [];

							for (const _ of builder.instructions) {
								const next = await builder.buildNextOptimalTransaction();
								const nextLast = await builder.rebuildLast(true);
								console.log(next);
								txs.push(nextLast);
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
								: Effect.fail(
										new BuildOptimalTxError({
											error: result.error,
										}),
									),
						),
					),
				),
			),
		),
	);

export type BuildAndSignTransactionWithAtlasPrime =
	typeof buildAndSignTransactionWithAtlasPrime;
