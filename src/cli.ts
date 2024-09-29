import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Command, InvalidOptionArgumentError, Option } from "commander";
import { parsePublicKey } from "./utils/public-key";
import { createMainLiveService } from "./utils/createLiveService";

const program = new Command("atom")
  .addOption(
    new Option(
      "-o, --owner <publicKey>",
      "The publicKey of the player's wallet"
    )
      .argParser(parsePublicKey)
      .makeOptionMandatory()
  )
  .addOption(
    new Option("-p, --playerProfile <publicKey>", "The publicKey of the player")
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
  .command("load-cargo") // pbk
  .option("--fleet <fleet>", "The fleet address") // pbk
  .option("--mints <mints...>", "Resources to load") // pbk
  .option("--amounts <amounts...>", "The amount of each resource") // pbk
  .option("--pods <pods...>", "Fleet cargo pods type") // fuel_tank, ammo_bank, cargo_hold
  .action(
    async (options: {
      fleet: string;
      mints: string[];
      amounts: String[];
      pods: string[];
    }) => {
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

      // const resourcesToLoad = zipWith(
      //   options.mints,
      //   options.amounts,
      //   options.pods,
      //   (mint, amount, pod) => [mint, amount, pod] as const
      // ) as [string, string, CargoPodKind][];

      // await Effect.runPromiseExit(
      //   GameService.pipe(
      //     Effect.andThen((service) =>
      //       service.methods.initGame(owner, playerProfile, service.context)
      //     ),
      //     Effect.provide(MainLive)
      //   )
      // );

      // for (const [mint, amount] of resourcesToLoad) {
      //   const exit = await Effect.runPromiseExit(
      //     loadCargo({
      //       mint: new PublicKey(mint),
      //       amount: Number(amount),
      //       fleetAddress: new PublicKey(options.fleet),
      //     }).pipe(Effect.provide(MainLive))
      //   );

      //   exit.pipe(
      //     Exit.match({
      //       onSuccess: (txId) => console.log(`Transaction ${txId} completed`),
      //       onFailure: (cause) =>
      //         console.log(`Transaction error: ${Cause.pretty(cause)}`),
      //     })
      //   );
      // }
    }
  );

program.parse(process.argv);
