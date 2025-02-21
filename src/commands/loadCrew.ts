import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { loadCrew } from "~/core/actions/loadCrew";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	crewAmount: number;
	globalOpts: GlobalOptions;
};

export const makeLoadCrewCommand = ({
	fleetNameOrAddress,
	crewAmount,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					loadCrew({
						fleetNameOrAddress,
						crewAmount,
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
				Effect.log("Crew load done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
