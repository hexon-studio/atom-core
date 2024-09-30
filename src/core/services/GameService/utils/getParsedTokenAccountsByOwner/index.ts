import type { Account } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { getParsedTokenAccountsByOwner as sageGetParsedTokenAccountsByOwner } from "@staratlas/data-source";
import { Data, Effect } from "effect";
import {
	type CreateKeypairError,
	type CreateProviderError,
	SolanaService,
} from "../../../SolanaService";

export class GetParsedTokenAccountsByOwnerError extends Data.TaggedError(
	"GetParsedTokenAccountsByOwnerError",
)<{ readonly error: unknown }> {}

export const getParsedTokenAccountsByOwner = (
	owner: PublicKey,
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
			}),
		),
	);

export type GetParsedTokenAccountsByOwner =
	typeof getParsedTokenAccountsByOwner;
