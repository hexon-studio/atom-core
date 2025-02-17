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
				"The publicKey of the player's wallet",
			)
				.argParser(parsePublicKey)
				.env("ATOM_OWNER")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option(
				"-p, --playerProfile <publickKey>",
				"The publicKey of the player",
			)
				.argParser(parsePublicKey)
				.env("ATOM_PLAYER_PROFILE")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option("-r, --rpcUrl <rpcUrl>", "The primary solona rpc url")
				.env("ATOM_RPC_URL")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option(
				"-k, --keypair <secretKey>",
				"The secret key of the hot wallet as a base58 string",
			)
				.argParser(parseSecretKey)
				.env("ATOM_HOT_WALLET")
				.makeOptionMandatory(true),
		)
		.addOption(
			new Option("-w, --webhookUrl <webhookUrl>", "The webhook url")
				.env("ATOM_WEBHOOK_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeLamports <feeLamports>", "The atom fee in lamports")
				.argParser((feeLamports) =>
					z.coerce.number().optional().parse(feeLamports),
				)
				.implies({ atlasPrime: false })
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeAtlas <feeAtlas>", "The atom fee in lamports")
				.argParser((feeAtlas) => z.coerce.number().optional().parse(feeAtlas))
				.implies({ atlasPrime: true })
				.makeOptionMandatory(false),
		)
		.option(
			"--feeRecipient <feeRecipient>",
			"The atom fee recipient",
			parsePublicKey,
		)
		.addOption(
			new Option(
				"--heliusRpcUrl <heliusRpc>",
				"Helius rpc url (used to calculate priority fees)",
			)
				.env("ATOM_HELIUS_RPC_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeMode <feeMode>", "Helius rpc used to calculate fees")
				.choices(["low", "medium", "high"])
				.default("low")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--feeLimit <feeLimit>",
				"The priority fee limit price in microlamports",
			)
				.argParser((value) => {
					const parsedValue = Number.parseInt(value, 10);

					if (Number.isNaN(parsedValue)) {
						throw new InvalidArgumentError("Not a number.");
					}

					return parsedValue;
				})
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--webhookSecret <webhookSecret>", "The webhook secret")
				.env("ATOM_WEBHOOK_SECRET")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--loggingToken <token>", "The cloud logging service token")
				.env("ATOM_LOGGING_TOKEN")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--commonApiUrl <commonApiUrl>",
				"An cache api endpoint returning common game data, if not provided data will be fetched from the blockchain",
			)
				.env("ATOM_COMMON_API_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"--contextId <contextId>",
				"If passed the webhook will be called with the contextId",
			).makeOptionMandatory(false),
		)
		.option("--atlas-prime", "Enable the use of Atlas Prime")
		.option(
			"--mipt, --max-ixs-per-transaction <mipt>",
			"Apply a limit of instructions on a transactions",
			"5",
		);

	program.command("recipe-list").action(async () => {
		const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

		return runRecipeList({
			globalOpts,
		});
	});

	program
		.command("start-crafting")
		.option(
			"-c, --crewAmount <crewAmount>",
			"The amount of crew to start crafting",
			(value) => z.coerce.number().parse(value),
		)
		.option("-q, --quantity <quantity>", "The quantity to craft", (value) =>
			z.coerce.number().parse(value),
		)
		.option("--recipe <recipe>", "The address of the recipe", parsePublicKey)
		.option("--sector <sector>", "The sector of the starbase")
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
		.option("--cid, --craftingId <craftingId>", "The crafting id", (value) =>
			z.coerce.number().parse(value),
		)
		.option("--recipe <recipe>", "The address of the recipe", parsePublicKey)
		.option("--sector <sector>", "The sector of the starbase")
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
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

			return runFleetInfo({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program.command("profile-info").action(async () => {
		const globalOpts = parseOptions(program.opts<CliGlobalOptions>());

		return runProfileInfo(globalOpts);
	});

	program
		.command("load-cargo <fleetNameOrAddress>")
		.option(
			"--resources <requiredResources...>",
			[
				"",
				"Comma separated list of resources to load <resource_address,mode,amount,cargo_pod>",
				"- resource_address: The mint of the resource",
				"- mode: fixed, max, min or min-and-fill",
				"	- fixed: The amount of the resource to load is fixed",
				"	- max: Add enough resource to reach the 'max' value",
				"	- min: Add enough resource to reach the 'min' value",
				"	- min-and-fill: Add enough resource to reach the 'min' value and fill the cargo pod (only if less than threshold)",
				"- amount: number to be used as fixed amount or threshold",
				`- cargo_pod: The type of cargo pod to use (${cargoPodKinds.join(", ")})`,
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
		.option(
			"--resources <requiredResources...>",
			[
				"",
				"Comma separated list of resources to load <resource_address,mode,amount,cargo_pod>",
				"- resource_address: The mint of the resource",
				"- mode: fixed, max",
				"	- fixed: The amount of the resource to load is fixed",
				"	- max: Add enough resource to reach the 'max' value",
				"- amount: number to be used as fixed amount or threshold",
				`- cargo_pod: The type of cargo pod to use (${cargoPodKinds.join(", ")})`,
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
		.argument("<fleetNameOrAddress>", "The fleet to start mining")
		.argument(
			"<resourceMint>",
			"The mint of the resource to mine",
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
		.argument("<fleetNameOrAddress>", "The fleet to stop mining")
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
		.argument("<fleetNameOrAddress>", "The fleet to load crew")
		.argument(
			"<crewAmount>",
			"The amount of crew to load",
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
		.argument("<fleetNameOrAddress>", "The fleet to unload crew")
		.argument(
			"<crewAmount>",
			"The amount of crew to unload",
			z.coerce.number().parse,
		)
		.option(
			"--allow-unload-required-crew",
			"Allow the unload of the fleet required crew",
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
		.argument("<fleetNameOrAddress>", "The fleet to stop mining")
		.argument("<targetSector>", "The coordinates of the target sector")
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
		.argument("<fleetNameOrAddress>", "The fleet to stop mining")
		.argument("<targetSector>", "Rhe coordinates of the target sector")
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
