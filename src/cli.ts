#!/usr/bin/env node

import { PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import {
	InvalidArgumentError,
	InvalidOptionArgumentError,
	Option,
	program as commander,
} from "commander";
import Dotenv from "dotenv";
import {
	Array as EffectArray,
	String as EffectString,
	Tuple,
	pipe,
} from "effect";
import { z } from "zod";
import { version as packageJsonVersion } from "../package.json";
import {
	runDock,
	runFleetInfo,
	runLoadCargo,
	runProfileInfo,
	runStartMining,
	runStopMining,
	runSubwarp,
	runUndock,
	runUnloadCargo,
	runWarp,
} from "./commands";
import { runLoadCrew } from "./commands/loadCrew";
import { runRecipeList } from "./commands/recipeList";
import { runStartCrafting } from "./commands/startCrafting";
import { runStartScan } from "./commands/startScan";
import { runStopCrafting } from "./commands/stopCrafting";
import { runUnloadCrew } from "./commands/unloadCrew";
import type { CliGlobalOptions } from "./types";
import {
	cargoPodKinds,
	loadResourceDecoder,
	unloadResourceDecoder,
} from "./utils/decoders";
import { parseSecretKey } from "./utils/keypair";
import { parseOptions } from "./utils/parseOptions";
import { isPublicKey, parsePublicKey } from "./utils/public-key";

Dotenv.config();

const main = async () => {
	const program = commander
		.name("atom")
		.version(packageJsonVersion)
		.addOption(
			new Option(
				"-o, --owner <publickKey>",
				"The publicKey of the player's wallet (required)",
			)
				.argParser(parsePublicKey)
				.env("ATOM_OWNER")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option(
				"-p, --playerProfile <publickKey>",
				"The publicKey of the player profile (required)",
			)
				.argParser(parsePublicKey)
				.env("ATOM_PLAYER_PROFILE")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option("-r, --rpcUrl <rpcUrl>", "Solana RPC endpoint URL (required)")
				.env("ATOM_RPC_URL")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option(
				"-k, --keypair <secretKey>",
				"Hot wallet secret key in base58 format (required)",
			)
				.argParser(parseSecretKey)
				.env("ATOM_HOT_WALLET")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option(
				"-w, --webhookUrl <webhookUrl>",
				"Webhook URL for notifications",
			)
				.env("ATOM_WEBHOOK_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeLamports <feeLamports>", "Core fee in lamports (SOL)")
				.argParser((feeLamports) =>
					z.coerce.number().optional().parse(feeLamports),
				)
				.implies({ atlasPrime: false })
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeAtlas <feeAtlas>", "Core fee in ATLAS tokens")
				.argParser((feeAtlas) => z.coerce.number().optional().parse(feeAtlas))
				.implies({ atlasPrime: true })
				.makeOptionMandatory(false),
		)
		.option(
			"--feeRecipient <feeRecipient>",
			"Public key of the fee recipient",
			parsePublicKey,
		)
		.addOption(
			new Option(
				"--heliusRpcUrl <heliusRpc>",
				"Helius RPC URL for priority fee calculations",
			)
				.env("ATOM_HELIUS_RPC_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeMode <feeMode>", "Priority fee level for transactions")
				.choices(["low", "medium", "high"])
				.default("low")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--feeLimit <feeLimit>",
				"Maximum priority fee per CU in microlamports",
			)
				.argParser((value) => {
					const parsedValue = Number.parseInt(value, 10);

					if (Number.isNaN(parsedValue)) {
						throw new InvalidArgumentError("Fee limit must be a valid number");
					}

					return parsedValue;
				})
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--webhookSecret <webhookSecret>",
				"Secret for webhook authentication",
			)
				.env("ATOM_WEBHOOK_SECRET")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--loggingToken <token>",
				"Authentication token for cloud logging service",
			)
				.env("ATOM_LOGGING_TOKEN")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--commonApiUrl <commonApiUrl>",
				"Cache API endpoint for game data (falls back to blockchain if not provided)",
			)
				.env("ATOM_COMMON_API_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--contextId <contextId>",
				"Custom identifier passed to webhook calls for tracking",
			).makeOptionMandatory(false),
		)
		.option("--atlas-prime", "Enable the use of Atlas Prime")
		.option(
			"--mipt, --max-ixs-per-transaction <mipt>",
			"Maximum number of instructions per transaction",
			"5",
		);

	program
		.command("recipe-list")
		.description("List all available crafting recipes")
		.action(async () => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runRecipeList({
				globalOpts,
			});
		});

	program
		.command("start-crafting")
		.description("Start crafting items at a starbase")
		.option(
			"-c, --crewAmount <crewAmount>",
			"Number of crew members to assign to crafting",
			(value) => z.coerce.number().parse(value),
		)
		.option("-q, --quantity <quantity>", "The quantity to craft", (value) =>
			z.coerce.number().parse(value),
		)
		.option(
			"--recipe <recipe>",
			"Public key of the recipe to craft",
			parsePublicKey,
		)
		.option("--sector <sector>", "Starbase sector coordinates (format: x,y)")
		.action(
			async (options: {
				crewAmount: number;
				quantity: number;
				recipe: PublicKey;
				sector: string;
			}) => {
				const { crewAmount, quantity, recipe, sector } = options;

				const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

				const maybeSector = EffectString.split(sector, ",");

				if (!Tuple.isTupleOf(maybeSector, 2)) {
					throw new InvalidArgumentError("Invalid sector coordinates");
				}

				const starbaseCoords = Tuple.mapBoth(maybeSector, {
					onFirst: (a) => new BN(a),
					onSecond: (a) => new BN(a),
				});

				return runStartCrafting({
					crewAmount,
					quantity,
					recipe,
					starbaseCoords,
					globalOpts,
				});
			},
		);

	program
		.command("stop-crafting")
		.description("Stop a completed crafting process")
		.option(
			"--cid, --craftingId <craftingId>",
			"ID of the crafting process to stop",
			(value) => z.coerce.number().parse(value),
		)
		.option(
			"--recipe <recipe>",
			"Public key of the recipe being crafted",
			parsePublicKey,
		)
		.option("--sector <sector>", "Starbase sector coordinates (format: x,y)")
		.action(
			async ({
				craftingId,
				recipe,
				sector,
			}: { craftingId: number; recipe: PublicKey; sector: string }) => {
				const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

				const maybeSector = EffectString.split(sector, ",");

				if (!Tuple.isTupleOf(maybeSector, 2)) {
					throw new InvalidArgumentError("Invalid sector coordinates");
				}

				const starbaseCoords = Tuple.mapBoth(maybeSector, {
					onFirst: (a) => new BN(a),
					onSecond: (a) => new BN(a),
				});

				return runStopCrafting({
					craftingId,
					recipe,
					starbaseCoords,
					globalOpts,
				});
			},
		);

	program
		.command("fleet-info <fleetNameOrAddress>")
		.description("Display detailed information about a fleet")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runFleetInfo({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("profile-info")
		.description("Display detailed information about a player profile")
		.action(async () => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runProfileInfo(globalOpts);
		});

	program
		.command("load-cargo <fleetNameOrAddress>")
		.description("Load resources into a fleet")
		.option(
			"--resources <requiredResources...>",
			[
				"",
				"Specify resources to load in the format: <resource_address,mode,amount,cargo_pod>",
				"Parameters:",
				"  resource_address: Public key of the resource",
				"  mode: How to load the resource:",
				"    - fixed: Load exact amount specified",
				"    - max: Fill up as much as possible until max value is reached",
				"    - min: Load at least the minimum required amount",
				"    - min-and-fill: Load minimum and fill remaining if below threshold",
				"  amount: Quantity to load or threshold value",
				`  cargo_pod: Type of cargo pod to use (${cargoPodKinds.join(", ")})`,
				"",
				"Example: --resources TOKEN_ADDRESS,fixed,100,cargo_hold",
			].join("\n"),
		)
		.action(
			async (
				fleetNameOrAddress: string,
				options: {
					resources: string[];
				},
			) => {
				const resources = options.resources ?? [];

				const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

				const items = pipe(
					resources,
					EffectArray.map(EffectString.split(",")),
					EffectArray.map(([resourceMint, mode, amount, cargoPodKind]) => ({
						amount: Number(amount),
						cargoPodKind,
						mode,
						resourceMint,
					})),
				);

				if (items.length === 0) {
					throw new InvalidOptionArgumentError(
						"At least one item is required. Use option --requiredResources or --optionalResources",
					);
				}

				const parsedItems = z.array(loadResourceDecoder).parse(items);

				return runLoadCargo({
					globalOpts,
					fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
						? new PublicKey(fleetNameOrAddress)
						: fleetNameOrAddress,
					items: parsedItems,
				});
			},
		);

	program
		.command("unload-cargo <fleetNameOrAddress>")
		.description("Unload cargo from a fleet")
		.option(
			"--resources <requiredResources...>",
			[
				"",
				"Specify resources to unload in the format: <resource_address,mode,amount,cargo_pod>",
				"Parameters:",
				"  resource_address: Public key of the resource",
				"  mode: How to unload the resource:",
				"    - fixed: Unload exact amount specified",
				"    - max: Unload as much as possible until max value is reached",
				"  amount: Quantity to unload",
				`  cargo_pod: Type of cargo pod to use (${cargoPodKinds.join(", ")})`,
				"",
				"Example: --resources TOKEN_ADDRESS,max,0,cargo",
			].join("\n"),
		)
		.action(
			async (
				fleetNameOrAddress: string,
				options: {
					resources: string[];
				},
			) => {
				const resources = options.resources ?? [];

				const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

				const items = pipe(
					resources,
					EffectArray.map(EffectString.split(",")),
					EffectArray.map(([resourceMint, mode, amount, cargoPodKind]) => ({
						amount: Number(amount),
						cargoPodKind,
						mode,
						resourceMint,
					})),
				);

				if (items.length === 0) {
					throw new InvalidOptionArgumentError(
						"At least one item is required. Use option --requiredResources or --optionalResources",
					);
				}

				const parsedItems = z.array(unloadResourceDecoder).parse(items);

				return runUnloadCargo({
					globalOpts,
					fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
						? new PublicKey(fleetNameOrAddress)
						: fleetNameOrAddress,
					items: parsedItems,
				});
			},
		);

	program
		.command("start-scan <fleetNameOrAddress>")
		.description("Start scanning the current sector with a fleet")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runStartScan({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("dock <fleetNameOrAddress>")
		.description("Dock a fleet at the starbase")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runDock({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("undock <fleetNameOrAddress>")
		.description("Undock a fleet from its current starbase")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runUndock({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("start-mining")
		.description("Start mining resources with a fleet")
		.argument("<fleetNameOrAddress>", "Name or address of the fleet to use")
		.argument(
			"<resourceMint>",
			"Public key of the resource to mine",
			parsePublicKey,
		)
		.action(async (fleetNameOrAddress: string, resourceMint: PublicKey) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runStartMining({
				globalOpts,
				resourceMint,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("stop-mining")
		.description("Stop the current mining operation")
		.argument(
			"<fleetNameOrAddress>",
			"Name or address of the fleet to stop mining with",
		)
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runStopMining({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("load-crew")
		.description("Load crew members into a fleet")
		.argument("<fleetNameOrAddress>", "Name or address of the fleet")
		.argument(
			"<crewAmount>",
			"Number of crew members to load",
			z.coerce.number().parse,
		)
		.action(async (fleetNameOrAddress: string, crewAmount: number) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runLoadCrew({
				globalOpts,
				crewAmount,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("unload-crew")
		.description("Unload crew members from a fleet")
		.argument("<fleetNameOrAddress>", "Name or address of the fleet")
		.argument(
			"<crewAmount>",
			"Number of crew members to unload",
			z.coerce.number().parse,
		)
		.option(
			"--allow-unload-required-crew",
			"Allow unloading crew members required for fleet operation (use with caution)",
		)
		.action(
			async (
				fleetNameOrAddress: string,
				crewAmount: number,
				options: { allowUnloadRequiredCrew: boolean },
			) => {
				const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

				return runUnloadCrew({
					globalOpts,
					crewAmount,
					allowUnloadRequiredCrew: options.allowUnloadRequiredCrew,
					fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
						? new PublicKey(fleetNameOrAddress)
						: fleetNameOrAddress,
				});
			},
		);

	program
		.command("warp")
		.description("Warp a fleet to a different sector")
		.argument("<fleetNameOrAddress>", "Name or address of the fleet to warp")
		.argument("<targetSector>", "Target sector coordinates (format: x,y)")
		.action(async (fleetNameOrAddress: string, targetSectorArg: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			const maybeSector = EffectString.split(targetSectorArg, ",");

			if (!Tuple.isTupleOf(maybeSector, 2)) {
				throw new InvalidArgumentError("Invalid sector coordinates");
			}

			const targetSector = Tuple.mapBoth(maybeSector, {
				onFirst: Number,
				onSecond: Number,
			});

			return runWarp({
				globalOpts,
				targetSector,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("subwarp")
		.description("Subwarp a fleet to a different sector")
		.argument("<fleetNameOrAddress>", "Name or address of the fleet to move")
		.argument("<targetSector>", "Target sector coordinates (format: x,y)")
		.action(async (fleetNameOrAddress: string, targetSectorArg: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			const maybeSector = EffectString.split(targetSectorArg, ",");

			if (!Tuple.isTupleOf(maybeSector, 2)) {
				throw new InvalidArgumentError("Invalid sector coordinates");
			}

			const targetSector = Tuple.mapBoth(maybeSector, {
				onFirst: Number,
				onSecond: Number,
			});

			return runSubwarp({
				globalOpts,
				targetSector: targetSector.map(Number) as [number, number],
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	await program.parseAsync(process.argv);
};

main();
