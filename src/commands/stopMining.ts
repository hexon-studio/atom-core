import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { stopMining } from "../core/actions/stopMining";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const makeStopMiningCommand = ({
	fleetNameOrAddress,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					stopMining({
						fleetNameOrAddress,
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
				Effect.log("Stop mining done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) => Effect.logError(error),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
