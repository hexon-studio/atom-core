import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Command, InvalidOptionArgumentError, Option } from "commander";
import { Cause, Effect, Exit } from "effect";
import { zipWith } from "lodash-es";
import { ResourceMint, resourceMintToName } from "./constants/resources";
import { loadCargo } from "./core/actions/loadCargo";
import { GameService } from "./core/services/GameService";
import { CargoPodKind } from "./types";
import { createMainLiveService } from "./utils/createLiveService";
import { parsePublicKey } from "./utils/public-key";

const program = new Command("atom")
  .addOption(
    new Option(
      "-o, --owner <publickKey>",
      "The publicKey of the player's wallet"
    )
      .argParser(parsePublicKey)
      .makeOptionMandatory()
  )
  .addOption(
    new Option(
      "-p, --playerProfile <publickKey>",
      "The publicKey of the player"
    )
      .argParser(parsePublicKey)
      .makeOptionMandatory()
  )
  .requiredOption("-r, --rpcUrl <rpcUrl>", "The solona rpc url")
  .addOption(
    new Option(
      "-k, --keypair <secretKey>",
      "The secret key of the hot wallet as a base58 string"
    )
      .argParser((secretKey) => {
        try {
          return Keypair.fromSecretKey(bs58.decode(secretKey));
        } catch {
          throw new InvalidOptionArgumentError("Invalid keypair");
        }
      })
      .makeOptionMandatory()
  );

program
  .command("load-cargo <fleetName>")
  .option("--resourceMints <resourcesMints...>", "Food to load")
  .option("-a, --requiredAmounts <resourceMinAmounts...>", "Required amounts")
  .option("-c, --cargoTypes <resourceMinAmounts...>", "Cargo types")
  .action(
    async (
      fleetName: string,
      options: {
        resourceMints: string[];
        requiredAmounts: String[];
        cargoTypes: string[];
      }
    ) => {
      const { keypair, rpcUrl, owner, playerProfile } = program.opts<{
        owner: PublicKey;
        playerProfile: PublicKey;
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
      ) as [ResourceMint, string, CargoPodKind][];

      await Effect.runPromiseExit(
        GameService.pipe(
          Effect.andThen((service) =>
            service.methods.initGame(owner, playerProfile, service.context)
          ),
          Effect.provide(MainLive)
        )
      );

      for (const [resourceMint, amount] of minResources) {
        const exit = await Effect.runPromiseExit(
          loadCargo({
            resourceName: resourceMintToName[resourceMint],
            amount: Number(amount),
            fleetName,
          }).pipe(Effect.provide(MainLive))
        );

        exit.pipe(
          Exit.match({
            onSuccess: (txId) => console.log(`Transaction ${txId} completed`),
            onFailure: (cause) =>
              console.log(`Transaction error: ${Cause.pretty(cause)}`),
          })
        );
      }
    }
  );

program.parse(process.argv);
