import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { startMining } from "../core/actions/startMining";
import { GameService } from "../core/services/GameService";
import type { GlobalOptions } from "../types";
import { createMainLiveService } from "../utils/createLiveService";

type Param = GlobalOptions & {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
};

export const runStartMining = async ({
	fleetNameOrAddress,
	resourceMint,
	keypair,
	owner,
	playerProfile,
	rpcUrl,
	supabaseUrl,
	supabaseKey,
	taskId,
}: Param) => {
	const mainServiceLive = createMainLiveService({
		keypair,
		rpcUrl,
		supabaseUrl,
		supabaseKey,
	});

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame(owner, playerProfile, service.context),
		),
		Effect.tap(() => Console.log("Game initialized.")),
		Effect.flatMap(() =>
			startMining({
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
