import { Keypair, PublicKey } from "@solana/web3.js";
import { Argument, Command, Option } from "commander";
import { zipWith } from "lodash-es";
import { ResourceMint } from "./constants/resources";
import { loadCargo } from "./core/loadCargo";
import { CargoPodKind } from "./types";
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
  .command("load-cargo")
  .addArgument(
    new Argument(
      "<starbaseAddress>",
      "The public key of the starbase"
    ).argParser(parsePublicKey)
  )
  .option("-r, --resourceMints <resourcesMints...>", "Food to load")
  .option("-a, --requiredAmounts <resourceMinAmounts...>", "Required amounts")
  .option("-c, --cargoTypes <resourceMinAmounts...>", "Cargo types")
  .action(
    (
      starbaseAddress: PublicKey,
      options: {
        resourceMints: string[];
        requiredAmounts: number[];
        cargoTypes: string[];
      }
    ) => {
      const globalOpts = program.opts<{
        player: PublicKey;
        keypair: Keypair;
        rpcUrl: string;
      }>();

      const minResources = zipWith(
        options.resourceMints,
        options.requiredAmounts,
        options.cargoTypes,
        (mint, amout, cargoType) => [mint, amout, cargoType] as const
      );

      loadCargo({
        ...globalOpts,
        starbaseAddress,
        minResources: minResources as Array<
          [ResourceMint, number, CargoPodKind]
        >,
      });
    }
  );

program.parse(process.argv);
