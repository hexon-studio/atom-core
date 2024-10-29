import type { PublicKey } from "@solana/web3.js";
import { Cause, Console, Effect, Exit, Option } from "effect";
import { loadCargo } from "../core/actions/loadCargo";
import { GameService } from "../core/services/GameService";
import type { CargoPodKind, GlobalOptionsWithSupabase } from "../types";
import { createMainLiveService } from "../utils/createLiveService";
import { runBaseCommand } from "./baseCommand";

type Param = GlobalOptionsWithSupabase & {
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
	supabaseArgs,
}: Param) => {
	const mainServiceLive = createMainLiveService({
		keypair,
		rpcUrl,
		supabaseArgs,
	});

	const program = GameService.pipe(
		Effect.tap((service) =>
			service.methods.initGame({
				owner,
				playerProfile,
				signerAddress: keypair.publicKey,
				contextRef: service.context,
			}),
		),
		Effect.tap(() => Console.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: loadCargo({
					fleetNameOrAddress,
					items,
				}),
				mapError: (err) => ({ tag: err._tag, message: err.message }),
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
