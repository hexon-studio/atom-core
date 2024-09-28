import { Account } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getParsedTokenAccountsByOwner as sageGetParsedTokenAccountsByOwner } from "@staratlas/data-source";
import { Data, Effect } from "effect";
import {
  CreateKeypairError,
  CreateProviderError,
  SolanaService,
} from "../../../SolanaService";

class GetParsedTokenAccountsByOwnerError extends Data.TaggedError(
  "GetParsedTokenAccountsByOwnerError"
)<{ readonly error: unknown }> {}

export const getParsedTokenAccountsByOwner = (
  owner: PublicKey
): Effect.Effect<
  Account[],
  CreateKeypairError | CreateProviderError | GetParsedTokenAccountsByOwnerError,
  SolanaService
> =>
  SolanaService.pipe(
    Effect.flatMap((service) => service.anchorProvider),
    Effect.flatMap((provider) =>
      Effect.tryPromise({
        try: () =>
          sageGetParsedTokenAccountsByOwner(provider.connection, owner),
        catch: (error) => new GetParsedTokenAccountsByOwnerError({ error }),
      })
    )
  );

export type GetParsedTokenAccountsByOwner =
  typeof getParsedTokenAccountsByOwner;
