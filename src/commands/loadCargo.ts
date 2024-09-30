import { Cause, Console, Effect, Exit, Option } from "effect";
import { type ResourceMint, resourceMintToName } from "../constants/resources";
import { loadCargo } from "../core/actions/loadCargo";
import { GameService } from "../core/services/GameService";
import type { CargoPodKind, RequiredParam } from "../types";
import { createMainLiveService } from "../utils/createLiveService";

type Param = RequiredParam & {
	fleetName: string;
	items: Array<{
		mint: ResourceMint;
		amount: number;
		cargoType: CargoPodKind;
	}>;
};
export const runLoadCargo = async ({
	keypair,
	fleetName,
	rpcUrl,
	items,
	owner,
	playerProfile,
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
		Effect.andThen(
			Effect.forEach(
				items,
				({ amount, mint }) =>
					loadCargo({
						fleetName,
						resourceName: resourceMintToName[mint],
						amount: amount,
					}),
				{ concurrency: 3 },
			),
		),
		Effect.provide(mainServiceLive),
	);

	const exit = await Effect.runPromiseExit(program);

	exit.pipe(
		Exit.match({
			onSuccess: (txId) => {
				console.log(`Transaction ${txId} completed`);
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
