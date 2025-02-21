import type { PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { Effect, Match } from "effect";
import { constNull, constUndefined } from "effect/Function";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { UnloadResourceInput } from "~/utils/decoders";
import type { GlobalOptions } from "~/utils/globalOptions";
import { unloadCargo } from "../core/actions/unloadCargo";
import { GameService } from "../core/services/GameService";
import { runBaseCommand } from "./baseCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	items: Array<UnloadResourceInput>;
	globalOpts: GlobalOptions;
};

export const makeUnloadCargoCommand = ({
	fleetNameOrAddress,
	items,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.flatMap(() =>
			runBaseCommand({
				self: () =>
					unloadCargo({
						fleetNameOrAddress,
						items,
					}),
				normalizeError: (err) => ({
					tag: err._tag,
					message: err.message,
					context: Match.value(err).pipe(
						Match.when(
							{ _tag: "LoadUnloadPartiallyFailedError" },
							({ context }) =>
								JSON.parse(
									JSON.stringify(context, (_, value) =>
										value instanceof BN ? value.toJSON() : value,
									),
								) as Record<string, unknown>,
						),
						Match.orElse(constUndefined),
					),
					signatures: Match.value(err).pipe(
						Match.when(
							{ _tag: "LoadUnloadPartiallyFailedError" },
							({ signatures }) => signatures,
						),
						Match.when(
							{ _tag: "TransactionFailedError" },
							({ signature }) => signature,
						),
						Match.orElse(constNull),
					),
				}),
			}),
		),
		Effect.tapBoth({
			onSuccess: (txIds) =>
				Effect.log("Unload done").pipe(Effect.annotateLogs({ txIds })),
			onFailure: (error) =>
				Effect.logError(`[${error._tag}] ${error.message}`).pipe(
					Effect.annotateLogs({ error }),
				),
		}),
		Effect.provide(createMainLiveService(globalOpts)),
	);
