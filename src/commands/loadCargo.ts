import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { loadCargo } from "../core/actions/loadCargo";
import { GameService } from "../core/services/GameService";
import type { RequiredParam } from "../types";
import { createMainLiveService } from "../utils/createLiveService";

type Param = RequiredParam & {
	fleetAddress: PublicKey;
	items: Array<{
		mint: PublicKey;
		amount: number;
	}>;
};

export const runLoadCargo = async ({
	fleetAddress,
	items,
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
			Effect.forEach(items, ({ amount, mint }) =>
				loadCargo({
					fleetAddress,
					mint,
					amount: amount,
				}),
			),
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
