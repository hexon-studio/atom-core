import { Effect } from "effect";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createReadyToExitSubwarpIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const exitSubwarp = (fleetName: string) =>
  Effect.gen(function* () {
    const fleetPubkey = yield* getFleetAddressByName(fleetName);
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.MoveSubwarp) {
      console.log("Fleet is not in subwarp, skipping...");
      return;
    }

    console.log("Exiting from subwarp...");

    const ix = yield* createReadyToExitSubwarpIx(fleetPubkey);

    const gameService = yield* GameService;

    const tx = yield* gameService.utils.buildAndSignTransaction([ix]);
    const txId = yield* gameService.utils.sendTransaction(tx);

    console.log("Exit subwarp completed!");

    return txId;
  });
