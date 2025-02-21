import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect } from "effect";
import { stopCrafting } from "~/core/actions/stopCrafting";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	recipe: PublicKey;
	craftingId: number;
	starbaseCoords: [number, number];
	globalOpts: GlobalOptions;
};

export const makeStopCraftingCommand = ({
	craftingId,
	recipe,
	starbaseCoords,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					stopCrafting({
						craftingId: new BN(craftingId),
						recipe,
						starbaseCoords,
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
				Effect.log("Start crafting done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
