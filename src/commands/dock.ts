import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { dockToStarbase } from "../core/actions/dockToStarbase";
import { GameService } from "../core/services/GameService";
import type { GlobalOptionsWithSupabase } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptionsWithSupabase;
};

export const runDock = async ({ fleetNameOrAddress, globalOpts }: Param) => {
	const { owner, playerProfile, keypair } = globalOpts;

	const mainServiceLive = createMainLiveService(globalOpts);

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame({
				owner,
				playerProfile,
				signerAddress: keypair.publicKey,
				contextRef: service.context,
			}),
		),
		Effect.tap(() => Console.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					dockToStarbase({
						fleetNameOrAddress,
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
		Effect.provide(mainServiceLive),
	);

	const exit = await Effect.runPromiseExit(program);

	exit.pipe(
		Exit.match({
			onSuccess: (txId) => {
				console.log(`Transactions ${txId.join(",")} completed`);
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
