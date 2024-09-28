import { Effect } from "effect";
import { ResourceName, resourceNameToMint } from "../../constants/resources";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { createDepositCargoToFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";

export const loadCargo = ({
  amount,
  fleetName,
  resourceName,
}: {
  amount: number;
  fleetName: string;
  resourceName: ResourceName;
}) =>
  Effect.gen(function* () {
    const fleetPubkey = yield* getFleetAddressByName(fleetName);

    console.log(`Loading cargo to fleet ${fleetName} (${fleetPubkey})`);

    const mintToken = resourceNameToMint[resourceName];

    const ixs = yield* createDepositCargoToFleetIx(
      fleetPubkey,
      mintToken,
      amount
    );

    const gameService = yield* GameService;

    const tx = yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(
      ixs
    );

    const txId = yield* gameService.utils.sendTransaction(tx);

    console.log("Fleet cargo loaded!");

    return txId;
  });
