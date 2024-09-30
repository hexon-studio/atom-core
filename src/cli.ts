import { Keypair, PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import { Command, InvalidOptionArgumentError, Option } from "commander";
import { zipWith } from "lodash";
import { runLoadCargo } from "./commands/loadCargo";
import type { CargoPodKind } from "./types";
import { parsePublicKey } from "./utils/public-key";

const program = new Command("atom")
	.addOption(
		new Option(
			"-o, --owner <publickKey>",
			"The publicKey of the player's wallet",
		)
			.argParser(parsePublicKey)
			.makeOptionMandatory(),
	)
	.addOption(
		new Option(
			"-p, --playerProfile <publickKey>",
			"The publicKey of the player",
		)
			.argParser(parsePublicKey)
			.makeOptionMandatory(),
	)
	.requiredOption("-r, --rpcUrl <rpcUrl>", "The solona rpc url")
	.addOption(
		new Option(
			"-k, --keypair <secretKey>",
			"The secret key of the hot wallet as a base58 string",
		)
			.argParser((secretKey) => {
				try {
					return Keypair.fromSecretKey(bs58.decode(secretKey));
				} catch (e) {
					throw new InvalidOptionArgumentError("Invalid keypair");
				}
			})
			.makeOptionMandatory(),
	);

program
	.command("load-cargo")
	.option("--fleet <fleet>", "The fleet address") // pbk
	.option("--mints <mints...>", "Resources to load") // pbk
	.option("--amounts <amounts...>", "The amount of each resource") // pbk
	.option("--pods <pods...>", "Fleet cargo pods type") // fuel_tank, ammo_bank, cargo_hold
	.action(
		async (
			fleetName: string,
			options: {
				fleet: string;
				mints: string[];
				amounts: string[];
				pods: string[];
			},
		) => {
			const globalOpts = program.opts<{
				owner: PublicKey;
				playerProfile: PublicKey;
				keypair: Keypair;
				rpcUrl: string;
			}>();

			return runLoadCargo({
				...globalOpts,
				fleetAddress: new PublicKey(options.fleet),
				items: zipWith(
					options.mints,
					options.amounts,
					options.pods,
					(mint, amount, pod) => ({
						mint: new PublicKey(mint),
						amount: Number(amount),
						cargoType: cargoType as CargoPodKind,
					}),
				),
			});
		},
	);
