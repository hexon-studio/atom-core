import { Effect } from "effect";
import { createDepositCargoToFleetIx } from "../fleet-utils/instructions";
import { GameService } from "../services/GameService";
import { PublicKey } from "@solana/web3.js";

export const loadCargo = ({
  amount,
  fleetAddress,
  mint,
}: {
  amount: number;
  fleetAddress: PublicKey;
  mint: PublicKey;
}) =>
  Effect.gen(function* () {
    // const fleetPubkey = yield* getFleetAddressByName(fleetName);

    console.log(`Loading cargo to fleet ${fleetAddress}`);

    // const mintToken = resourceNameToMint[resourceName];

    const ixs = yield* createDepositCargoToFleetIx(fleetAddress, mint, amount);

    const gameService = yield* GameService;

    const tx = yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(
      ixs
    );

    const txId = yield* gameService.utils.sendTransaction(tx);

    console.log("Fleet cargo loaded!");

    return txId;
  });
