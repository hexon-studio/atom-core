import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { unloadCrew } from "~/core/actions/unloadCrew";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	allowUnloadRequiredCrew: boolean;
	crewAmount: number;
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const makeUnloadCrewCommand = ({
	fleetNameOrAddress,
	crewAmount,
	allowUnloadRequiredCrew,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					unloadCrew({
						fleetNameOrAddress,
						crewAmount,
						allowUnloadRequiredCrew,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					signatures:
						err._tag === "TransactionFailedError" ? err.signature : null,
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Crew unload done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
