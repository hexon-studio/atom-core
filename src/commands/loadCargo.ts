import type { PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { Effect } from "effect";
import type { NonEmptyArray } from "effect/Array";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { loadCargo } from "../core/actions/loadCargo";
import { GameService } from "../core/services/GameService";
import type { LoadResourceInput } from "../utils/decoders";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	items: NonEmptyArray<LoadResourceInput>;
	globalOpts: GlobalOptions;
};

export const makeLoadCargoCommand = ({
	fleetNameOrAddress,
	items,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					loadCargo({
						fleetNameOrAddress,
						items,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					signatures:
						err._tag === "LoadUnloadPartiallyFailedError"
							? err.signatures
							: null,
					context:
						err._tag === "LoadUnloadPartiallyFailedError"
							? (JSON.parse(
									JSON.stringify(err.context, (_, value) =>
										value instanceof BN ? value.toString() : value,
									),
								) as Record<string, unknown>)
							: undefined,
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Load done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
