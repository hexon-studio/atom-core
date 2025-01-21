import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ProfileVault } from "@staratlas/profile-vault";
import { Effect, Array as EffectArray, unsafeCoerce } from "effect";
import { getAssociatedTokenAccountBalance } from "~/utils/getAssociatedTokenAccountBalance";
import { MIN_ATLAS_QTY, MIN_SOL_QTY, tokenMints } from "../constants/tokens";
import { getSagePrograms } from "../core/programs";
import {
	AtlasNotEnoughError,
	SolNotEnoughError,
} from "../core/services/GameService/methods/initGame";
import { getGameContext } from "../core/services/GameService/utils";
import { fireWebhookEvent } from "../utils/fireWebhookEvent";
import { GameService } from "~/core/services/GameService";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const checkAtlasBalance = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile.key,
			context.owner,
		);

		const funderVault = getAssociatedTokenAddressSync(
			tokenMints.atlas,
			vaultAuthority,
			true,
		);

		const atlasBalance = yield* getAssociatedTokenAccountBalance(funderVault);

		if (atlasBalance.ltn(MIN_ATLAS_QTY)) {
			return yield* Effect.fail(new AtlasNotEnoughError());
		}

		return atlasBalance;
	});

const checkSolBalance = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();
		const signer = yield* GameService.signer;

		const solBalance = yield* Effect.tryPromise(() =>
			programs.sage.provider.connection.getBalance(signer.publicKey()),
		);

		const minSolQty = MIN_SOL_QTY * LAMPORTS_PER_SOL;

		if (solBalance < minSolQty) {
			return yield* Effect.fail(new SolNotEnoughError());
		}

		return solBalance;
	});

export const runBaseCommand = <E, R>({
	self,
	normalizeError,
}: {
	self: () => Effect.Effect<string[], E, R>;
	normalizeError: (error: E) => {
		tag: string;
		message: string;
		signatures: string | string[] | null;
		context?: Record<string, unknown>;
	};
}) =>
	Effect.gen(function* () {
		yield* fireWebhookEvent({ type: "start" });

		const gameContext = yield* getGameContext();

		if (gameContext.atlasPrime) {
			yield* checkAtlasBalance();
		} else {
			yield* checkSolBalance();
		}

		// yield* fireWebhookEvent({
		// 	type: "atlas-balance",
		// 	payload: { balance: balance.toString() },
		// });

		const signatures = yield* self();

		// const provider = yield* SolanaService.anchorProvider;

		// const txs = yield* Effect.all(
		// 	signatures.map((signature) =>
		// 		Effect.tryPromise(() =>
		// 			provider.connection.getTransaction(signature, {
		// 				commitment: "confirmed",
		// 				maxSupportedTransactionVersion: 0,
		// 			}),
		// 		),
		// 	),
		// ).pipe(
		// 	Effect.orElseSucceed(EffectArray.empty),
		// 	Effect.map(EffectArray.map(Option.fromNullable)),
		// 	Effect.map(EffectArray.getSomes),
		// 	Effect.map(EffectArray.map(tx => tx.transaction.message.)),
		// );

		// console.dir({ txs }, { depth: null });

		const context = yield* getGameContext();

		yield* fireWebhookEvent({
			type: "success",
			payload: {
				signatures,
				removeCredit:
					!!context.fees && !context.fees.feeAddress && signatures.length > 0,
			},
		});

		return signatures;
	}).pipe(
		Effect.tapError((error) => {
			const { tag, message, signatures, context } = normalizeError(
				unsafeCoerce(error),
			);

			return fireWebhookEvent({
				type: "error",
				payload: {
					tag,
					message,
					signatures: EffectArray.ensure(signatures ?? []),
					context,
				},
			});
		}),
	);
