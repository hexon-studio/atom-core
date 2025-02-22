import type { PublicKey } from "@solana/web3.js";
import { Effect, type Option } from "effect";
import { getPlayerProfileAccount } from "~/libs/@staratlas/player-profile";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { GameService } from "../core/services/GameService";
import { getGameContext } from "../core/services/GameService/utils";

export const makeProfileInfoCommand =
	({ playerProfile }: { playerProfile: Option.Option<PublicKey> }) =>
	(globalOpts: GlobalOptions) =>
		GameService.pipe(
			Effect.tap((service) =>
				service.initGame(service.gameContext, globalOpts),
			),
			Effect.flatMap(() =>
				playerProfile.pipe(
					Effect.flatMap(getPlayerProfileAccount),
					Effect.orElse(() =>
						getGameContext().pipe(
							Effect.map((context) => context.playerProfile),
						),
					),
				),
			),
			Effect.tap((profile) =>
				Effect.log("Profile fetched.").pipe(Effect.annotateLogs({ profile })),
			),
			Effect.provide(createMainLiveService(globalOpts)),
		);
