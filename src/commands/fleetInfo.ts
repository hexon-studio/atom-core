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
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { GameService } from "../core/services/GameService";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createLiveService";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptionsWithWebhook;
};

export const runFleetInfo = async ({
	fleetNameOrAddress,
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
		Effect.flatMap(() => getFleetAccountByNameOrAddress(fleetNameOrAddress)),
		Effect.tap((fleet) =>
			Effect.logInfo("Fleet found").pipe(Effect.annotateLogs({ fleet })),
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
