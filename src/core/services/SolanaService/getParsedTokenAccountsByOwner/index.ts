import type { Account } from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { getParsedTokenAccountsByOwner as sageGetParsedTokenAccountsByOwner } from "@staratlas/data-source";
import { Effect } from "effect";
import { GetParsedTokenAccountsByOwnerError } from "~/errors";

export const createGetParsedTokenAccountsByOwner =
	(connection: Connection) =>
	(
		owner: PublicKey,
	): Effect.Effect<Account[], GetParsedTokenAccountsByOwnerError> =>
		Effect.tryPromise({
			try: () => sageGetParsedTokenAccountsByOwner(connection, owner),
			catch: (error) => new GetParsedTokenAccountsByOwnerError({ error }),
		});

export type GetParsedTokenAccountsByOwner = ReturnType<
	typeof createGetParsedTokenAccountsByOwner
>;
