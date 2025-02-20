import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createMainLiveService } from "~/utils/createMainLiveService";
import type { GlobalOptions } from "~/utils/globalOptions";
import { GameService } from "../core/services/GameService";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const makeFleetInfoCommand = ({
	fleetNameOrAddress,
	globalOpts,
}: Param) =>
	GameService.pipe(
		Effect.tap((service) => service.initGame(service.gameContext, globalOpts)),
		Effect.tap(() => Effect.log("Game initialized.")),
		Effect.flatMap(() => getFleetAccountByNameOrAddress(fleetNameOrAddress)),
		Effect.tap((fleet) =>
			Effect.logInfo("Fleet found").pipe(Effect.annotateLogs({ fleet })),
		),
		Effect.provide(createMainLiveService(globalOpts)),
	);
