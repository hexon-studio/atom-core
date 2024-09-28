import { Effect } from "effect";

export const exitWarp = (fleetName: string) =>
  Effect.gen(function* () {
    // const fleetPubkey = yield* getFleetAddressByName(fleetName);
    // const fleetAccount = yield* getFleetAccount(fleetPubkey);
    // if (!fleetAccount.state.MoveWarp) {
    //   console.log("Fleet is not in warp, skipping...");
    //   return;
    // }
    // console.log("Exiting from warp...");
    // const ix = yield* createReadyToExitWarpIx(fleetPubkey);
    // const gameService = yield* GameService;
    // const tx = yield* gameService.utils.buildAndSignTransaction([ix]);
    // const txId = yield* gameService.utils.sendTransaction(tx);
    // console.log("Exit warp completed!");
    // return txId;
  });
