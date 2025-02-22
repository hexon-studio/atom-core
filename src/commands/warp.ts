import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { warpToSector } from "../core/actions/warpToSector";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
};

export const makeWarpCommand =
	({ fleetNameOrAddress, targetSector }: Param) =>
	(globalOpts: GlobalOptions) =>
		GameService.pipe(
			Effect.tap((service) =>
				service.initGame(service.gameContext, globalOpts),
			),
			Effect.flatMap(() =>
				runBaseCommand({
					self: () =>
						warpToSector({
							fleetNameOrAddress,
							targetSector,
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
					Effect.log("Warp done").pipe(Effect.annotateLogs({ txIds })),
				onFailure: (error) =>
					Effect.logError(`[${error._tag}] ${error.message}`).pipe(
						Effect.annotateLogs({ error }),
					),
			}),
			Effect.provide(createMainLiveService(globalOpts)),
		);
