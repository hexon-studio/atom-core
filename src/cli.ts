import { type Keypair, PublicKey } from "@solana/web3.js";
import { Command } from "commander";
import { Array as EffectArray, pipe } from "effect";
import { z } from "zod";
import { runDock } from "./commands/dock";
import { runLoadCargo } from "./commands/loadCargo";
import { runUndock } from "./commands/undock";
import { runUnloadCargo } from "./commands/unloadCargo";
import { cargoPodKindDecoder } from "./types";
import { parseSecretKey } from "./utils/keypair";
import { isPublicKey, parsePublicKey } from "./utils/public-key";

const main = async () => {
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

	const itemsDecoder = z.array(
		z.object({
			resourceMint: z.string(),
			amount: z.number(),
			cargoPodKind: cargoPodKindDecoder,
		}),
	);

	program
		.command("load-cargo <fleetNameOrAddress>")
		.requiredOption("--mints <mints...>", "Resources to load") // pbk
		.requiredOption("--amounts <amounts...>", "The amount of each resource") // pbk
		.requiredOption("--pods <pods...>", "Fleet cargo pods type") // fuel_tank, ammo_bank, cargo_hold
		.action(
			async (
				fleetNameOrAddress: string,
				options: {
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

				const items = pipe(
					options.mints,
					EffectArray.zip(options.amounts),
					EffectArray.zipWith(options.pods, ([mint, amount], cargoPodKind) => ({
						resourceMint: mint,
						amount: Number(amount),
						cargoPodKind,
					})),
				);

				const parsedItems = itemsDecoder.parse(items).map((item) => ({
					...item,
					resourceMint: new PublicKey(item.resourceMint),
				}));

				return runLoadCargo({
					...globalOpts,
					fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
						? new PublicKey(fleetNameOrAddress)
						: fleetNameOrAddress,
					items: parsedItems,
				});
			},
		);

	program
		.command("unload-cargo <fleetNameOrAddress>")
		.requiredOption("--mints <mints...>", "Resources to load") // pbk
		.requiredOption("--amounts <amounts...>", "The amount of each resource") // pbk
		.requiredOption("--pods <pods...>", "Fleet cargo pods type") // fuel_tank, ammo_bank, cargo_hold
		.action(
			async (
				fleetNameOrAddress: string,
				options: {
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

				const items = pipe(
					options.mints,
					EffectArray.zip(options.amounts),
					EffectArray.zipWith(options.pods, ([mint, amount], cargoPodKind) => ({
						resourceMint: mint,
						amount: Number(amount),
						cargoPodKind,
					})),
				);

				const parsedItems = itemsDecoder.parse(items).map((item) => ({
					...item,
					resourceMint: new PublicKey(item.resourceMint),
				}));

				return runUnloadCargo({
					...globalOpts,
					fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
						? new PublicKey(fleetNameOrAddress)
						: fleetNameOrAddress,
					items: parsedItems,
				});
			},
		);

	program
		.command("dock <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = program.opts<{
				owner: PublicKey;
				playerProfile: PublicKey;
				keypair: Keypair;
				rpcUrl: string;
			}>();

			return runDock({
				...globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("undock <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = program.opts<{
				owner: PublicKey;
				playerProfile: PublicKey;
				keypair: Keypair;
				rpcUrl: string;
			}>();

			return runUndock({
				...globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	await program.parseAsync(process.argv);
};

main();
