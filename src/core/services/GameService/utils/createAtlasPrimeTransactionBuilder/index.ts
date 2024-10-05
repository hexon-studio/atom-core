import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import type {
	InstructionReturn,
	TransactionReturn,
} from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { Data, Effect } from "effect";
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

export class BuildAndSignTransactionWithAtlasPrimeError extends Data.TaggedError(
	"BuildAndSignTransactionWithAtlasPrimeError",
)<{ error: unknown }> {
	override get message() {
		return String(this.error);
	}
}

export class BuildOptinalTxError extends Data.TaggedError(
	"BuildOptinalTxError",
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
	| BuildOptinalTxError
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
						try: () => {
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

							return builder.buildDynamic();
						},
						catch: (error) =>
							new BuildAndSignTransactionWithAtlasPrimeError({
								error,
							}),
					}),
				),
				Effect.flatMap((result) =>
					result.isOk()
						? Effect.succeed(result.value)
						: Effect.fail(
								new BuildOptinalTxError({
									error: result.error,
								}),
							),
				),
			),
		),
	);

export type BuildAndSignTransactionWithAtlasPrime =
	typeof buildAndSignTransactionWithAtlasPrime;
