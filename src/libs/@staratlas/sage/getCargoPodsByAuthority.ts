import type { PublicKey } from "@solana/web3.js";
import { getCargoPodsByAuthority as sageGetCargoPodsByAuthority } from "@staratlas/sage";
import { Data, Effect } from "effect";
import { getSagePrograms } from "../../../core/programs";
import { SolanaService } from "../../../core/services/SolanaService";

export class GetCargoPodsByAuthorityError extends Data.TaggedError(
	"GetCargoPodsByAuthorityError",
)<{ error: unknown }> {}

export const getCargoPodsByAuthority = (authority: PublicKey) =>
	Effect.all([SolanaService.anchorProvider, getSagePrograms()]).pipe(
		Effect.flatMap(([provider, programs]) =>
			Effect.tryPromise({
				try: () =>
					sageGetCargoPodsByAuthority(
						provider.connection,
						programs.cargo,
						authority,
					),
				catch: (error) => new GetCargoPodsByAuthorityError({ error }),
			}),
		),
		Effect.head,
	);
