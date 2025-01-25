import type { PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import {
	Cause,
	Effect,
	Exit,
	LogLevel,
	Logger,
	ManagedRuntime,
	Option,
} from "effect";
import { loadCargo } from "../core/actions/loadCargo";
import { GameService } from "../core/services/GameService";
import type { LoadResourceInput } from "../decoders";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createMainLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	items: Array<LoadResourceInput>;
	globalOpts: GlobalOptionsWithWebhook;
};

export const runLoadCargo = async ({
	fleetNameOrAddress,
	items,
	globalOpts,
}: Param) => {
	const { keypair, owner, playerProfile, feeUrl } = globalOpts;

	const mainServiceLive = createMainLiveService(globalOpts);

	const runtime = ManagedRuntime.make(mainServiceLive);

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.initGame({
				atlasPrime: globalOpts.atlasPrime,
				owner,
				playerProfile,
				signerAddress: keypair.publicKey,
				contextRef: service.gameContext,
				feeUrl,
			}),
		),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					loadCargo({
						fleetNameOrAddress,
						items,
						applyTxSizeLimit: globalOpts.applyTxSizeLimit,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					signatures:
						err._tag === "LoadUnloadPartiallyFailedError"
							? err.signatures
							: null,
					context:
						err._tag === "LoadUnloadPartiallyFailedError"
							? (JSON.parse(
									JSON.stringify(err.context, (_, value) =>
										value instanceof BN ? value.toString() : value,
									),
								) as Record<string, unknown>)
							: undefined,
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Load done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Logger.withMinimumLogLevel(LogLevel.Debug),
	);

	const exit = await runtime.runPromiseExit(program);

	await runtime.dispose();

	exit.pipe(
		Exit.match({
			onSuccess: () => {
				process.exit(0);
			},
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
