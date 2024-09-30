import { Effect } from "effect";
import { GameService } from "../core/services/GameService";
import type { RequiredParam } from "../types";
import { createMainLiveService } from "./createLiveService";

export const createLiveAndInitGame = ({
	keypair,
	owner,
	playerProfile,
	rpcUrl,
}: RequiredParam) => {
	const MainLive = createMainLiveService({
		keypair,
		rpcUrl,
	});

	return Effect.runPromiseExit(
		GameService.pipe(
			Effect.andThen((service) =>
				service.methods.initGame(owner, playerProfile, service.context),
			),
			Effect.provide(MainLive),
		),
	);
};
