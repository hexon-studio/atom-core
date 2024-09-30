import { Keypair, type PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import { Command, InvalidOptionArgumentError, Option } from "commander";
import { zipWith } from "lodash";
import { runLoadCargo } from "./commands/loadCargo";
import type { ResourceMint } from "./constants/resources";
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
	.command("load-cargo <fleetName>")
	.option("--resourceMints <resourcesMints...>", "Food to load")
	.option("-a, --requiredAmounts <resourceMinAmounts...>", "Required amounts")
	.option("-c, --cargoTypes <resourceMinAmounts...>", "Cargo types")
	.action(
		async (
			fleetName: string,
			options: {
				resourceMints: string[];
				requiredAmounts: string[];
				cargoTypes: string[];
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
				fleetName,
				items: zipWith(
					options.resourceMints,
					options.requiredAmounts,
					options.cargoTypes,
					(mint, amount, cargoType) => ({
						mint: mint as ResourceMint,
						amount: Number(amount),
						cargoType: cargoType as CargoPodKind,
					}),
				),
			});
		},
	);

program.parse(process.argv);
