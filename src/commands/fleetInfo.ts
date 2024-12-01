import type { PublicKey } from "@solana/web3.js";
import { Cause, Effect, Exit, LogLevel, Logger, Option } from "effect";
import { GameService } from "../core/services/GameService";
import { getFleetAccount } from "../core/utils/accounts";
import { getFleetAddressByName } from "../core/utils/pdas";
import type { GlobalOptionsWithWebhook } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { isPublicKey } from "../utils/public-key";

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
			isPublicKey(fleetNameOrAddress)
				? Effect.succeed(fleetNameOrAddress)
				: getFleetAddressByName(fleetNameOrAddress),
		),
		Effect.flatMap((fleetAddress) => getFleetAccount(fleetAddress)),
		Effect.tap((fleet) =>
			Effect.logInfo("Fleet found").pipe(Effect.annotateLogs({ fleet })),
		),
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
