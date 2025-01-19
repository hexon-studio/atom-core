import {
	Cause,
	Effect,
	Exit,
	LogLevel,
	Logger,
	ManagedRuntime,
	Option,
} from "effect";
import { GameService } from "../core/services/GameService";
import { getGameContext } from "../core/services/GameService/utils";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createMainLiveService";

export const runProfileInfo = async (globalOpts: GlobalOptionsWithWebhook) => {
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
		Effect.flatMap(getGameContext),
		Effect.map((context) => context.playerProfile),
		Effect.tap((profile) =>
			Effect.log("Profile fetched.").pipe(Effect.annotateLogs({ profile })),
		),
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
