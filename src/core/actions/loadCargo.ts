import { Effect } from "effect";
import { ResourceName, resourceNameToMint } from "../../constants/resources";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createDepositCargoToFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const loadCargo = ({
  fleetName,
  resourceName,
  amount,
}: {
  fleetName: string;
  resourceName: ResourceName;
  amount: number;
}) =>
  Effect.gen(function* () {
    const fleetPubkey = yield* getFleetAddressByName(fleetName);

    console.log("Loading cargo to fleet...");

    const mintToken = resourceNameToMint[resourceName];

    const ix = yield* createDepositCargoToFleetIx(
      fleetPubkey,
      mintToken,
      amount
    );

    const gameService = yield* GameService;

    const tx = yield* gameService.utils.buildAndSignTransaction(ix);
    const txId = yield* gameService.utils.sendTransaction(tx);

    console.log("Fleet cargo loaded!");
    return txId;
  });
