import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { warpToSector } from "../core/actions/warpToSector";
import { GameService } from "../core/services/GameService";
import type { GlobalOptionsWithSupabase } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = GlobalOptionsWithSupabase & {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
};

export const runWarp = async ({
	fleetNameOrAddress,
	targetSector,
	keypair,
	owner,
	playerProfile,
	rpcUrl,
	supabaseArgs,
}: Param) => {
	const mainServiceLive = createMainLiveService({
		keypair,
		rpcUrl,
		supabaseArgs,
	});

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame(owner, playerProfile, service.context),
		),
		Effect.tap(() => Console.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: warpToSector({
					fleetNameOrAddress,
					targetSector,
				}),
				mapError: (err) => err._tag,
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
