import { Effect } from "effect";
import { ResourceName } from "../../constants/resources";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import {
  FleetNotIdleError,
  createStartMiningIx,
} from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const startMining = (
  fleetName: string,
  resource: ResourceName,
  time: number
) =>
  Effect.gen(function* () {
    const fleetPubkey = yield* getFleetAddressByName(fleetName);

    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.Idle) {
      return yield* Effect.fail(new FleetNotIdleError());
    }

    console.log(`Start mining ${resource}...`);

    const ix = yield* createStartMiningIx(fleetPubkey, resource);

    const gameService = yield* GameService;

    const tx = yield* gameService.utils.buildAndSignTransaction([ix]);
    const txId = yield* gameService.utils.sendTransaction(tx);

    console.log(`Mining started! Waiting for ${time} seconds...`);

    yield* Effect.sleep(time * 1000);

    return txId;
  });
