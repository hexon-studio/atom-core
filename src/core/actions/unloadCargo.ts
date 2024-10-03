import { Effect } from "effect";
import {
	type ResourceName,
	resourceNameToMint,
} from "../../constants/resources";
import type { CargoPodKind } from "../../types";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createWithdrawCargoFromFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

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
