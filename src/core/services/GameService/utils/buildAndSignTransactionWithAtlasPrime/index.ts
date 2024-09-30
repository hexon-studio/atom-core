import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import { InstructionReturn, TransactionReturn } from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { Data, Effect } from "effect";
import { GameNotInitializedError, getGameContext } from "..";
import { GameService } from "../..";
import { tokenMints } from "../../../../../constants/tokens";
import {
  fetchDummyKeys,
  FetchDummyKeysError,
} from "../../../../atlas-core-utils/dummy-keys";
import {
  getPlayerProfileAccout,
  ReadFromRPCError,
} from "../../../../fleet-utils/accounts";
import { SagePrograms } from "../../../../programs";
import {
  CreateKeypairError,
  CreateProviderError,
  SolanaService,
} from "../../../SolanaService";

class BuildAndSignTransactionWithAtlasPrimeError extends Data.TaggedError(
  "BuildAndSignTransactionWithAtlasPrimeError"
)<{ error: unknown }> {
  get message() {
    return String(this.error);
  }
}

class BuildOptinalTxError extends Data.TaggedError("BuildOptinalTxError")<{
  error: string;
}> {
  get message() {
    return this.error;
  }
}

export const buildAndSignTransactionWithAtlasPrime = (
  instructions: Array<InstructionReturn>
): Effect.Effect<
  TransactionReturn,
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
      ])
    ),
    Effect.flatMap(([programs, provider, signer, context, dummyKeys]) =>
      getPlayerProfileAccout(context.playerProfile).pipe(
        Effect.andThen((playerProfile) =>
          Effect.tryPromise({
            try: () => {
              const [vaultAuthority] = ProfileVault.findVaultSigner(
                programs.profileVaultProgram,
                context.playerProfile,
                context.owner
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
                      true
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

              return builder.buildNextOptimalTransaction();
            },
            catch: (error) =>
              new BuildAndSignTransactionWithAtlasPrimeError({
                error,
              }),
          })
        ),
        Effect.flatMap((result) =>
          result.isOk()
            ? Effect.succeed(result.value)
            : Effect.fail(
                new BuildOptinalTxError({
                  error: result.error,
                })
              )
        )
      )
    )
  );

export type BuildAndSignTransactionWithAtlasPrime =
  typeof buildAndSignTransactionWithAtlasPrime;
