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
import { runDock } from "./commands/dock";
import { runFleetInfo } from "./commands/fleetInfo";
import { runProfileInfo } from "./commands/profileInfo";
import { runStartMining } from "./commands/startMining";
import { runStopMining } from "./commands/stopMining";
import { runSubwarp } from "./commands/subwarp";
import { runUndock } from "./commands/undock";
import { runUnloadCargo } from "./commands/unloadCargo";
import { runWarp } from "./commands/warp";
import {
	cargoPodKinds,
	loadResourceDecoder,
	unloadResourceDecoder,
} from "./decoders";
import { runLoadCargo } from "./main";
import type { GlobalOptions } from "./types";
import { creactOptionsWithSupabase } from "./utils/creactOptionsWithSupabase";
import { parseSecretKey } from "./utils/keypair";
import { isPublicKey, parsePublicKey } from "./utils/public-key";

Dotenv.config();

const main = async () => {
	const program = commander
		.name("atom")
		.version(process.env.npm_package_version ?? "0.0.0")
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
				"-sr, --secondaryRpcUrl <rpcUrl>",
				"The secondary solona rpc url (used to build and send tx only)",
			)
				.env("ATOM_SECONDARY_RPC_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"-hr, --hellomoonRpc <rpcUrl>",
				"Hellomoon rpc used to calculate fees",
			)
				.env("ATOM_HELLOMOON_RPC_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("--feeMode <feeMode>", "Hellomoon rpc used to calculate fees")
				.choices(["low", "medium", "high"])
				.default("low")
				.makeOptionMandatory(false),
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
				"-su, --supabaseUrl <supabaseUrl>",
				"The supabase database url",
			)
				.env("ATOM_SUPABASE_URL")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option("-sk, --supabaseKey <supabaseKey>", "The supabase anon key")
				.env("ATOM_SUPABASE_KEY")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"-at, --accessToken <accessToken>",
				"The supabase account access token",
			)
				.env("ATOM_SUPABASE_ACCESS_TOKEN")
				.makeOptionMandatory(false),
		)
		.addOption(
			new Option(
				"-t, --taskId <taskId>",
				"The task to update",
			).makeOptionMandatory(false),
		)
		.option("--verbose", "Print additional logs", false);

	program
		.command("fleet-info <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
			);

			return runFleetInfo({
				globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program.command("profile-info").action(async () => {
		const globalOpts = creactOptionsWithSupabase(program.opts<GlobalOptions>());

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

				const globalOpts = creactOptionsWithSupabase(
					program.opts<GlobalOptions>(),
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

				const globalOpts = creactOptionsWithSupabase(
					program.opts<GlobalOptions>(),
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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
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
		.argument("<targetSector>", "Rhe coordinates of the target sector")
		.action(async (fleetNameOrAddress: string, targetSectorArg: string) => {
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
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
