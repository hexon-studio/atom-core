import type { PublicKey } from "@solana/web3.js";
import { getCargoPodsByAuthority as sageGetCargoPodsByAuthority } from "@staratlas/sage";
import { Effect } from "effect";
import { GetCargoPodsByAuthorityError } from "~/errors/cargo";
import { getSagePrograms } from "../../../../core/programs";
import { SolanaService } from "../../../../core/services/SolanaService";

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
		Effect.catchTag("NoSuchElementException", (error) =>
			Effect.fail(new GetCargoPodsByAuthorityError({ error })),
		),
	);
