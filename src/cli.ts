import { Keypair, PublicKey } from "@solana/web3.js";
import { Command, Option } from "commander";
import { Effect, Exit } from "effect";
import { zipWith } from "lodash-es";
import { ResourceMint, resourceMintToName } from "./constants/resources";
import { loadCargo } from "./core/actions/loadCargo";
import { CargoPodKind } from "./types";
import { createMainLiveService } from "./utils/createLiveService";
import { parsePublicKey } from "./utils/public-key";

const program = new Command("atom")
  .addOption(
    new Option("-p, --player <publickKey>", "The publicKey of the player")
      .argParser(parsePublicKey)
      .makeOptionMandatory()
  )
  .addOption(
    new Option("-r, --rpcUrl <rpcUrl>", "The solona rpc url")
      .argParser(parsePublicKey)
      .makeOptionMandatory()
  );

//   .addOption(
//     new Option("-k, --keypair <secretKey>", "The secret key of the hot wallet")
//       .argParser((secretKey) => {
//         try {
//           return Keypair.fromSecretKey(bs58.decode(secretKey));
//         } catch {
//           throw new InvalidOptionArgumentError("Invalid hot wallet keypair");
//         }
//       })
//       .makeOptionMandatory()
//   );

program
  .command("load-cargo <fleetName>")
  .option("-r, --resourceMints <resourcesMints...>", "Food to load")
  .option("-a, --requiredAmounts <resourceMinAmounts...>", "Required amounts")
  .option("-c, --cargoTypes <resourceMinAmounts...>", "Cargo types")
  .action(
    async (
      fleetName: string,
      options: {
        resourceMints: string[];
        requiredAmounts: number[];
        cargoTypes: string[];
      }
    ) => {
      const { keypair, rpcUrl } = program.opts<{
        player: PublicKey;
        keypair: Keypair;
        rpcUrl: string;
      }>();

      const MainLive = createMainLiveService({
        keypair,
        rpcUrl,
      });

      const minResources = zipWith(
        options.resourceMints,
        options.requiredAmounts,
        options.cargoTypes,
        (mint, amout, cargoType) => [mint, amout, cargoType] as const
      ) as [ResourceMint, number, CargoPodKind][];

      for (const [resourceMint, amount] of minResources) {
        const exit = await Effect.runPromiseExit(
          loadCargo({
            resourceName: resourceMintToName[resourceMint],
            amount,
            fleetName,
          }).pipe(Effect.provide(MainLive))
        );

        exit.pipe(
          Exit.match({
            onSuccess: (txId) => console.log(`Transaction ${txId} completed`),
            onFailure: (txId) => console.log(`Transaction ${txId} completed`),
          })
        );
      }
    }
  );

program.parse(process.argv);
