import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { loadCargo } from "../core/actions/loadCargo";
import { GameService } from "../core/services/GameService";
import type { CargoPodKind, GlobalOptions } from "../types";
import { createMainLiveService } from "../utils/createLiveService";

type Param = GlobalOptions & {
	fleetNameOrAddress: string | PublicKey;
	items: Array<{
		resourceMint: PublicKey;
		amount: "full" | number;
		cargoPodKind: CargoPodKind;
	}>;
};

export const runLoadCargo = async ({
	fleetNameOrAddress,
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
			loadCargo({
				fleetNameOrAddress,
				items,
			}),
		),
		Effect.provide(mainServiceLive),
	);

	const exit = await Effect.runPromiseExit(program);

	exit.pipe(
		Exit.match({
			onSuccess: (txIds) => {
				console.log(`Transactions ${txIds.join(",")} completed`);
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
