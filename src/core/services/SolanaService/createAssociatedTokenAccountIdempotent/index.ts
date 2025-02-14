import type { PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotent as sageCreateAssociatedTokenAccountIdempotent } from "@staratlas/data-source";
import { Effect } from "effect";
import { CreateAssociatedTokenAccountIdempotentError } from "~/errors";

export const createAssociatedTokenAccountIdempotent = (
	mint: PublicKey,
	owner: PublicKey,
	allowOwnerOffCurve = true,
) =>
	Effect.try({
		try: () =>
			sageCreateAssociatedTokenAccountIdempotent(
				mint,
				owner,
				allowOwnerOffCurve,
			),
		catch: (error) =>
			new CreateAssociatedTokenAccountIdempotentError({ error }),
	});

export type CreateAssociatedTokenAccountIdempotent =
	typeof createAssociatedTokenAccountIdempotent;
