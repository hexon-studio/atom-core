import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { startMining } from "../core/actions/startMining";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
	globalOpts: GlobalOptions;
};

export const makeStartMining = ({
	fleetNameOrAddress,
	resourceMint,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					startMining({
						fleetNameOrAddress,
						resourceMint,
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
				Effect.log("Start mining done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
