import { Effect } from "effect";

export const subwarpToSector = (
  fleetName: string,
  [x, y]: [number, number],
  waitingTime: number,
  waitingCooldownTime?: number
) =>
  Effect.gen(function* () {
    // const fleetPubkey = yield* getFleetAddressByName(fleetName);
    // const fleetAccount = yield* getFleetAccount(fleetPubkey);
    // if (!fleetAccount.state.Idle) {
    //   return yield* Effect.fail(new FleetNotIdleError());
    // }
    // console.log("Start warp...");
    // const [startingSectorX, startingSectorY] = fleetAccount.state.Idle
    //   .sector as [BN, BN];
    // const [targetSectorX, targetSectorY]: [BN, BN] = [
    //   startingSectorX.add(new BN(x)),
    //   startingSectorY.add(new BN(y)),
    // ];
    // if (
    //   startingSectorX.eq(targetSectorX) &&
    //   startingSectorY.eq(targetSectorY)
    // ) {
    //   console.log("Fleet is already in target sector, skipping...");
    //   return;
    // }
    // console.log(`Subwarp from - X: ${startingSectorX} | Y: ${startingSectorY}`);
    // console.log(`Subwarp to - X: ${targetSectorX} | Y: ${targetSectorY}`);
    // const ixs = yield* createWarpToCoordinateIx(fleetPubkey, [
    //   targetSectorX,
    //   targetSectorY,
    // ]);
    // const gameService = yield* GameService;
    // const tx = yield* gameService.utils.buildAndSignTransaction([ixs]);
    // const txId = yield* gameService.utils.sendTransaction(tx);
    // console.log(`Waiting for ${waitingTime} seconds...`);
    // yield* Effect.sleep(waitingTime * 1000);
    // console.log(`Warp completed!`);
    // if (waitingCooldownTime) {
    //   console.log(`Waiting for ${waitingCooldownTime} seconds...`);
    //   yield* Effect.sleep(waitingCooldownTime * 1000);
    // }
    // return txId;
  });
