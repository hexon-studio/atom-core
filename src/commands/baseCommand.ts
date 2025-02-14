import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ProfileVault } from "@staratlas/profile-vault";
import { Effect, Array as EffectArray, unsafeCoerce } from "effect";
import { GameService } from "~/core/services/GameService";
import { AtlasNotEnoughError, SolNotEnoughError } from "~/errors";
import { fetchTokenBalance } from "~/utils/fetchTokenBalance";
import { getSolBalance } from "~/utils/getSolBalance";
import { MIN_ATLAS_QTY, MIN_SOL_QTY, tokenMints } from "../constants/tokens";
import { getSagePrograms } from "../core/programs";
import { getGameContext } from "../core/services/GameService/utils";
import { fireWebhookEvent } from "../utils/fireWebhookEvent";

const checkAtlasBalance = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile.key,
			context.options.owner,
		);

		const funderVault = getAssociatedTokenAddressSync(
			tokenMints.atlas,
			vaultAuthority,
			true,
		);

		const atlasBalance = yield* fetchTokenBalance(funderVault);

		if (atlasBalance.ltn(MIN_ATLAS_QTY)) {
			return yield* Effect.fail(new AtlasNotEnoughError());
		}

		return atlasBalance;
	});

const checkSolBalance = () =>
	Effect.gen(function* () {
		const signer = yield* GameService.signer;

		const solBalance = yield* getSolBalance(signer.publicKey());

		const minLamportsRequired = MIN_SOL_QTY * LAMPORTS_PER_SOL;

		if (solBalance < minLamportsRequired) {
			return yield* Effect.fail(new SolNotEnoughError());
		}

		return solBalance;
	});

export const runBaseCommand = <A extends { signatures: string[] }, E, R>({
	self,
	normalizeError,
}: {
	self: () => Effect.Effect<A, E, R>;
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

		if (gameContext.options.atlasPrime) {
			yield* checkAtlasBalance();
		} else {
			yield* checkSolBalance();
		}

		const result = yield* self();

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
				...result,
				removeCredit:
					!!context.fees &&
					!context.fees.feeAddress &&
					result.signatures.length > 0,
			},
		});

		return result.signatures;
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
