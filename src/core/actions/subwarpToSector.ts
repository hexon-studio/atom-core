import { BN } from "@staratlas/anchor";
import { Effect } from "effect";
import { getFleetAccount } from "../fleet-utils/accounts";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import {
  FleetNotIdleError,
  createSubwarpToCoordinateIx,
  getTimeToSubwarp,
} from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const subwarpToSector = (fleetName: string, [x, y]: [number, number]) =>
  Effect.gen(function* () {
    const fleetPubkey = yield* getFleetAddressByName(fleetName);
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.Idle) {
      return yield* Effect.fail(new FleetNotIdleError());
    }

    console.log("Start subwarp...");

    const [startingSectorX, startingSectorY] = fleetAccount.state.Idle
      .sector as [BN, BN];

    const [targetSectorX, targetSectorY]: [BN, BN] = [
      startingSectorX.add(new BN(x)),
      startingSectorY.add(new BN(y)),
    ];

    console.log(`Subwarp from - X: ${startingSectorX} | Y: ${startingSectorY}`);
    console.log(`Subwarp to - X: ${targetSectorX} | Y: ${targetSectorY}`);

    if (
      startingSectorX.eq(targetSectorX) &&
      startingSectorY.eq(targetSectorY)
    ) {
      console.log("Fleet is already in target sector, skipping...");
      return;
    }

    const timeToSubwarp = yield* getTimeToSubwarp(
      fleetPubkey,
      [startingSectorX, startingSectorY],
      [targetSectorX, targetSectorY]
    );

    const ixs = yield* createSubwarpToCoordinateIx(fleetPubkey, [
      targetSectorX,
      targetSectorY,
    ]);

    const gameService = yield* GameService;

    const tx = yield* gameService.utils.buildAndSignTransaction([ixs]);
    const txId = yield* gameService.utils.sendTransaction(tx);

    console.log(`Waiting for ${timeToSubwarp} seconds...`);

    yield* Effect.sleep(timeToSubwarp * 1000);

    return txId;
  });
