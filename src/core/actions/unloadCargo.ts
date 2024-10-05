import { Effect } from "effect";
import {
	type ResourceName,
	resourceNameToMint,
} from "../../constants/resources";
import type { CargoPodKind } from "../../types";
import { createWithdrawCargoFromFleetIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";

export const unloadCargo = (
	fleetName: string,
	resourceName: ResourceName,
	amount: number,
	podKind: CargoPodKind,
) =>
	Effect.gen(function* () {
		const fleetPubkey = yield* getFleetAddressByName(fleetName);

		console.log("Unloading cargo from fleet...");

		const mintToken = resourceNameToMint[resourceName];

		const ix = yield* createWithdrawCargoFromFleetIx(
			fleetPubkey,
			mintToken,
			amount,
			podKind,
		);

		const gameService = yield* GameService;

		const tx = yield* gameService.utils.buildAndSignTransaction(ix);
		const txId = yield* gameService.utils.sendTransaction(tx);

		console.log("Fleet cargo unloaded!");
		return txId;
	});
