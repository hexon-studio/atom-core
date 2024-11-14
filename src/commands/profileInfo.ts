import { Cause, Console, Effect, Exit, Option } from "effect";
import { GameService } from "../core/services/GameService";
import { getGameContext } from "../core/services/GameService/utils";
import type { GlobalOptionsWithSupabase } from "../types";
import { createMainLiveService } from "../utils/createLiveService";

export const runProfileInfo = async (globalOpts: GlobalOptionsWithSupabase) => {
	const { keypair, owner, playerProfile, verbose } = globalOpts;

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
		Effect.tap(() => verbose && Console.log("Game initialized.")),
		Effect.flatMap(getGameContext),
		Effect.map((context) => context.playerProfile),
		Effect.provide(mainServiceLive),
	);

	const exit = await Effect.runPromiseExit(program);

	exit.pipe(
		Exit.match({
			onSuccess: (playerProfile) => {
				console.log(JSON.stringify(playerProfile, null, 2));
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
