import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ProfileVault } from "@staratlas/profile-vault";
import { BN } from "bn.js";
import {
	Cause,
	Effect,
	Array as EffectArray,
	Exit,
	LogLevel,
	Logger,
	ManagedRuntime,
	Match,
	Option,
} from "effect";
import { type LazyArg, unsafeCoerce } from "effect/Function";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import type { SolanaService } from "~/core/services/SolanaService";
import type * as Errors from "~/errors";
import {
	AtlasNotEnoughError,
	LoadUnloadPartiallyFailedError,
	SolNotEnoughError,
	TransactionFailedError,
} from "~/errors";
import type { GlobalOptions } from "~/types";
import { createMainLiveService } from "~/utils/createMainLiveService";
import { fetchTokenBalance } from "~/utils/fetchTokenBalance";
import { fireWebhookEvent } from "~/utils/fireWebhookEvent";
import { getSolBalance } from "~/utils/getSolBalance";
import {
	MIN_ATLAS_QTY,
	MIN_SOL_QTY,
	noopPublicKey,
	tokenMints,
} from "../constants/tokens";
import { getSagePrograms } from "../core/programs";

const checkAtlasBalance = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile.key,
			context.options.kind === "exec" ? context.options.owner : noopPublicKey,
		);

		const funderVault = getAssociatedTokenAddressSync(
			tokenMints.atlas,
			vaultAuthority,
			true,
		);

		const atlasBalance = yield* fetchTokenBalance(funderVault).pipe(
			Effect.orElseSucceed(() => new BN(0)),
		);

		if (atlasBalance.ltn(MIN_ATLAS_QTY)) {
			return yield* Effect.fail(
				new AtlasNotEnoughError({
					amountAvailable: atlasBalance.toString(),
					amountRequired: MIN_ATLAS_QTY.toString(),
				}),
			);
		}

		return atlasBalance;
	});

const checkSolBalance = () =>
	Effect.gen(function* () {
		const signer = yield* GameService.signer;

		const solBalance = yield* getSolBalance(signer.publicKey());

		const minLamportsRequired = MIN_SOL_QTY * LAMPORTS_PER_SOL;

		if (solBalance < minLamportsRequired) {
			return yield* Effect.fail(
				new SolNotEnoughError({
					amountAvailable: (solBalance / LAMPORTS_PER_SOL).toString(),
					amountRequired: (minLamportsRequired / LAMPORTS_PER_SOL).toString(),
				}),
			);
		}

		return solBalance;
	});

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type ExtractInstance<T> = T extends { new (...args: any[]): infer U }
	? U
	: never;

type ErrorsUnion = ExtractInstance<(typeof Errors)[keyof typeof Errors]>;

const extractErrorInfo = Match.type<ErrorsUnion>().pipe(
	Match.when(Match.instanceOf(TransactionFailedError), (error) => ({
		tag: error._tag,
		message: error.message,
		signatures: [error.signature],
		context: null,
	})),
	Match.when(Match.instanceOf(LoadUnloadPartiallyFailedError), (error) => ({
		tag: error._tag,
		message: error.message,
		signatures: error.signatures,
		context: error.context,
	})),
	Match.orElse((error) => ({
		tag: error._tag,
		message: error.message,
		signatures: EffectArray.empty<string>(),
		context: null,
	})),
);

export const makeAtomCommand =
	<A, E>(self: LazyArg<Effect.Effect<A, E, GameService | SolanaService>>) =>
	async (globalOpts: GlobalOptions) => {
		const program = Effect.gen(function* () {
			const service = yield* GameService;

			yield* GameService.initGame(service.gameContext, globalOpts);

			yield* fireWebhookEvent({ type: "start" });

			if (globalOpts.kind === "exec") {
				const checkBalance = globalOpts.atlasPrime
					? checkAtlasBalance
					: checkSolBalance;

				yield* checkBalance();
			}

			const result = yield* self();

			yield* fireWebhookEvent({
				type: "success",
				payload: result,
			});

			yield* Effect.log("Done.").pipe(Effect.annotateLogs({ result }));

			return result;
		}).pipe(
			Effect.tapError((error) =>
				Effect.log("Done with errors.").pipe(Effect.annotateLogs({ error })),
			),
			Effect.tapError((error) => {
				const { tag, message, signatures, context } = extractErrorInfo(
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
			Logger.withMinimumLogLevel(LogLevel.Debug),
		);

		const runtime = ManagedRuntime.make(createMainLiveService(globalOpts));
		const exit = await runtime.runPromiseExit(program);

		exit.pipe(
			Exit.match({
				onSuccess: () => process.exit(0),
				onFailure: (cause) => {
					console.log(`Transaction error: ${Cause.pretty(cause)}`);
					const error = Cause.failureOption(cause).pipe(Option.getOrUndefined);

					if (error) {
						console.log(error);
					}

					process.exit(1);
				},
			}),
		);
	};
