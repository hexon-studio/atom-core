import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { GameService } from "../core/services/GameService";
import type { RequiredParam } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { stopMining } from "../core/actions/stopMining";

type Param = RequiredParam & {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
};

export const runStopMining = async ({
	fleetNameOrAddress,
	resourceMint,
	keypair,
	owner,
	playerProfile,
	rpcUrl,
}: Param) => {
	const mainServiceLive = createMainLiveService({
		keypair,
		rpcUrl,
	});

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame(owner, playerProfile, service.context),
		),
		Effect.tap(() => Console.log("Game initialized.")),
		Effect.flatMap(() =>
			stopMining({
				fleetNameOrAddress,
				resourceMint,
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
