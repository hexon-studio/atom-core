import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { GameService } from "../core/services/GameService";
import { getFleetAccount } from "../core/utils/accounts";
import { getFleetAddressByName } from "../core/utils/pdas";
import type { GlobalOptions } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { isPublicKey } from "../utils/public-key";

type Param = GlobalOptions & {
	fleetNameOrAddress: string | PublicKey;
};

export const runFleetInfo = async ({
	fleetNameOrAddress,
	keypair,
	rpcUrl,
	owner,
	playerProfile,
	verbose,
}: Param) => {
	const mainServiceLive = createMainLiveService({
		keypair,
		rpcUrl,
	});

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame(owner, playerProfile, service.context),
		),
		Effect.tap(() => verbose && Console.log("Game initialized.")),
		Effect.flatMap(() =>
			isPublicKey(fleetNameOrAddress)
				? Effect.succeed(fleetNameOrAddress)
				: getFleetAddressByName(fleetNameOrAddress),
		),
		Effect.flatMap((fleetAddress) => getFleetAccount(fleetAddress)),
		Effect.provide(mainServiceLive),
	);

	const exit = await Effect.runPromiseExit(program);

	exit.pipe(
		Exit.match({
			onSuccess: (fleet) => {
				console.log(JSON.stringify(fleet, null, 2));
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
