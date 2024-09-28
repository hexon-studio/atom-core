import { PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotent as sageCreateAssociatedTokenAccountIdempotent } from "@staratlas/data-source";
import { Data, Effect } from "effect";

class CreateAssociatedTokenAccountIdempotentError extends Data.TaggedError(
  "CreateAssociatedTokenAccountIdempotentError"
)<{ readonly error: unknown }> {}

export const createAssociatedTokenAccountIdempotent = (
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = true
) =>
  Effect.try({
    try: () =>
      sageCreateAssociatedTokenAccountIdempotent(
        mint,
        owner,
        allowOwnerOffCurve
      ),
    catch: (error) =>
      new CreateAssociatedTokenAccountIdempotentError({ error }),
  });

export type CreateAssociatedTokenAccountIdempotent =
  typeof createAssociatedTokenAccountIdempotent;
