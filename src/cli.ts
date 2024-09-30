import { type Keypair, PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import lodash from "lodash";
import { runLoadCargo } from "./commands/loadCargo";
import { parseSecretKey } from "./utils/keypair";
import { parsePublicKey } from "./utils/public-key";

const program = new Command("atom")
	.requiredOption(
		"-o, --owner <publickKey>",
		"The publicKey of the player's wallet",
		parsePublicKey,
	)
	.requiredOption(
		"-p, --playerProfile <publickKey>",
		"The publicKey of the player",
		parsePublicKey,
	)
	.requiredOption("-r, --rpcUrl <rpcUrl>", "The solona rpc url")
	.requiredOption(
		"-k, --keypair <secretKey>",
		"The secret key of the hot wallet as a base58 string",
		parseSecretKey,
	);

program
	.command("load-cargo")
	.requiredOption(
		"--fleet <publicKey>",
		"The publicKey of the fleet",
		parsePublicKey,
	)
	.requiredOption("--mints <mints...>", "Resources to load") // pbk
	.requiredOption("--amounts <amounts...>", "The amount of each resource") // pbk
	// .requiredOption("--pods <pods...>", "Fleet cargo pods type") // fuel_tank, ammo_bank, cargo_hold
	.action(
		async (options: {
			fleet: PublicKey;
			mints: string[];
			amounts: string[];
			// pods: string[];
		}) => {
			const globalOpts = program.opts<{
				owner: PublicKey;
				playerProfile: PublicKey;
				keypair: Keypair;
				rpcUrl: string;
			}>();

			return runLoadCargo({
				...globalOpts,
				fleetAddress: options.fleet,
				items: lodash.zipWith(
					options.mints,
					options.amounts,
					// options.pods,
					(mint, amount) => ({
						mint: new PublicKey(mint),
						amount: Number(amount),
					}),
				),
			});
		},
	);

program.parse(process.argv);
