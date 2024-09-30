import {
	type InstructionReturn,
	type TransactionReturn,
	buildAndSignTransaction as sageBuildAndSignTransaction,
} from "@staratlas/data-source";
import { Data, Effect } from "effect";
import { GameService } from "../..";
import {
	type CreateKeypairError,
	type CreateProviderError,
	SolanaService,
} from "../../../SolanaService";

export class BuildAndSignTransactionError extends Data.TaggedError(
	"BuildAndSignTransactionError",
)<{ error: unknown }> {}

export const buildAndSignTransaction = (
	instructions: Array<InstructionReturn>,
): Effect.Effect<
	TransactionReturn,
	BuildAndSignTransactionError | CreateKeypairError | CreateProviderError,
	SolanaService | GameService
> =>
	Effect.all([SolanaService, GameService]).pipe(
		Effect.flatMap(([solanaService, gameService]) =>
			Effect.all([solanaService.anchorProvider, gameService.signer]),
		),
		Effect.flatMap(([provider, signer]) =>
			Effect.tryPromise({
				try: () =>
					sageBuildAndSignTransaction(instructions, signer, {
						connection: provider.connection,
					}),
				catch: (error) => {
					return new BuildAndSignTransactionError({ error });
				},
			}),
		),
	);

export type BuildAndSignTransaction = typeof buildAndSignTransaction;
