import type { PublicKey } from "@solana/web3.js";
import {
	Cause,
	Effect,
	Exit,
	LogLevel,
	Logger,
	ManagedRuntime,
	Option,
} from "effect";
import { warpToSector } from "../core/actions/warpToSector";
import { GameService } from "../core/services/GameService";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
	globalOpts: GlobalOptionsWithWebhook;
};

export const runWarp = async ({
	fleetNameOrAddress,
	targetSector,
	globalOpts,
}: Param) => {
	const { keypair, owner, playerProfile, feeUrl } = globalOpts;

	const mainServiceLive = createMainLiveService(globalOpts);

	const runtime = ManagedRuntime.make(mainServiceLive);

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.initGame({
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
					warpToSector({
						fleetNameOrAddress,
						targetSector,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					signatures:
						err._tag === "TransactionFailedError" ||
						err._tag === "ConfirmTransactionError"
							? err.signature
							: null,
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Warp done").pipe(Effect.annotateLogs({ txIds })),
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
