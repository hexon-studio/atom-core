#!/usr/bin/env node

import { PublicKey } from "@solana/web3.js";
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
import {
	cargoPodKinds,
	loadResourceDecoder,
	unloadResourceDecoder,
} from "./decoders";
import type { CliGlobalOptions } from "./types";
import { createOptionsWithWebhook } from "./utils/creactOptionsWithWebhook";
import { parseSecretKey } from "./utils/keypair";
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
			new Option(
				"-hr, --heliusRpcUrl <heliusRpc>",
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
			new Option("-w, --webhookUrl <webhookUrl>", "The webhook url")
				.env("ATOM_WEBHOOK_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("-ws, --webhookSecret <webhookSecret>", "The webhook secret")
				.env("ATOM_WEBHOOK_SECRET")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--loggingToken <token>", "The cloud logging service token")
				.env("ATOM_LOGGING_TOKEN")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("-fu, --feeUrl <feeUrl>", "The fee url").makeOptionMandatory(
				false,
			),
		)
		.addOption(
			new Option(
				"--contextId <contextId>",
				"If passed the webhook will be called with the contextId",
			).makeOptionMandatory(false),
		);

	program
		.command("fleet-info <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

			return runFleetInfo({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program.command("profile-info").action(async () => {
		const globalOpts = createOptionsWithWebhook(
			program.opts<CliGlobalOptions>(),
		);

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

				const globalOpts = createOptionsWithWebhook(
					program.opts<CliGlobalOptions>(),
				);

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

				const globalOpts = createOptionsWithWebhook(
					program.opts<CliGlobalOptions>(),
				);

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
		.command("dock <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

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
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

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
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

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
		.argument(
			"<resourceMint>",
			"The mint of the resource to mine",
			parsePublicKey,
		)
		.action(async (fleetNameOrAddress: string, resourceMint: PublicKey) => {
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

			return runStopMining({
				globalOpts,
				resourceMint,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("warp")
		.argument("<fleetNameOrAddress>", "The fleet to stop mining")
		.argument("<targetSector>", "The coordinates of the target sector")
		.action(async (fleetNameOrAddress: string, targetSectorArg: string) => {
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

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
			const globalOpts = createOptionsWithWebhook(
				program.opts<CliGlobalOptions>(),
			);

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
