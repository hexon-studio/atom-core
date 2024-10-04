import { Effect } from "effect";
import type { ResourceName } from "../../constants/resources";
import { getFleetAccount } from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";
import {
	FleetNotIdleError,
	createStartMiningIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { PublicKey } from "@solana/web3.js";

export const startMining = (
	fleetName: string,
	resource: ResourceName,
	time: number,
) =>
	Effect.gen(function* () {
		const fleetPubkey = yield* getFleetAddressByName(fleetName);

		const fleetAccount = yield* getFleetAccount(fleetPubkey);

		if (!fleetAccount.state.Idle) {
			return yield* Effect.fail(new FleetNotIdleError());
		}

		console.log(`Start mining ${resource}...`);

		const planetPubkey = new PublicKey("")

		const ix = yield* createStartMiningIx(fleetPubkey, resource, planetPubkey);

		const gameService = yield* GameService;

		const tx = yield* gameService.utils.buildAndSignTransaction([ix]);
		const txId = yield* gameService.utils.sendTransaction(tx);

		console.log(`Mining started! Waiting for ${time} seconds...`);

		yield* Effect.sleep(time * 1000);

		return txId;
	});
