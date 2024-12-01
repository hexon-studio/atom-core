import type { PublicKey } from "@solana/web3.js";
import { Cause, Effect, Exit, LogLevel, Logger, Option } from "effect";
import { stopMining } from "../core/actions/stopMining";
import { GameService } from "../core/services/GameService";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
	globalOpts: GlobalOptionsWithWebhook;
};

export const runStopMining = async ({
	fleetNameOrAddress,
	resourceMint,
	globalOpts,
}: Param) => {
	const { keypair, owner, playerProfile, feeUrl } = globalOpts;

	const mainServiceLive = createMainLiveService(globalOpts);

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame({
				owner,
				playerProfile,
				signerAddress: keypair.publicKey,
				contextRef: service.context,
				feeUrl,
			}),
		),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					stopMining({
						fleetNameOrAddress,
						resourceMint,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					signature:
						err._tag === "TransactionFailedError" ||
						err._tag === "ConfirmTransactionError"
							? err.signature
							: undefined,
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Stop mining done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) => Effect.logError(error),
		}),
		Logger.withMinimumLogLevel(LogLevel.Debug),
		Effect.provide(mainServiceLive),
	);

	const exit = await Effect.runPromiseExit(program);

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
