#!/usr/bin/env node

import { PublicKey } from "@solana/web3.js";
import { InvalidArgumentError, Option, program as commander } from "commander";
import Dotenv from "dotenv";
import {
	Array as EffectArray,
	String as EffectString,
	Match,
	Tuple,
	pipe,
} from "effect";
import { z } from "zod";
import { runDock } from "./commands/dock";
import { runFleetInfo } from "./commands/fleetInfo";
import { runStartMining } from "./commands/startMining";
import { runStopMining } from "./commands/stopMining";
import { runSubwarp } from "./commands/subwarp";
import { runUndock } from "./commands/undock";
import { runUnloadCargo } from "./commands/unloadCargo";
import { runWarp } from "./commands/warp";
import { runLoadCargo } from "./main";
import {
	type CargoPodKind,
	type GlobalOptions,
	cargoPodKindDecoder,
	cargoPodKinds,
} from "./types";
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
			new Option("-r, --rpcUrl <rpcUrl>", "The solona rpc url")
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
				"-t, --taskId <taskId>",
				"The task to update",
			).makeOptionMandatory(false),
		)
		.option("--verbose", "Print additional logs", false);

	const itemsDecoder = z.array(
		z.object({
			resourceMint: z.string().transform((value) => new PublicKey(value)),
			amount: z.union([z.literal("full"), z.number()]),
			cargoPodKind: cargoPodKindDecoder,
		}),
	);

	program
		.command("fleet-info <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
			);

			return runFleetInfo({
				...globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	program
		.command("load-cargo <fleetNameOrAddress>")
		.requiredOption("--mints <mints...>", "Resources to load")
		.requiredOption("--amounts <amounts...>", "The amount of each resource")
		.addOption(
			new Option("--pods <pods...>", "Fleet cargo pods type")
				.choices(cargoPodKinds)
				.makeOptionMandatory(true),
		)
		.action(
			async (
				fleetNameOrAddress: string,
				options: {
					mints: string[];
					amounts: string[];
					pods: CargoPodKind[];
				},
			) => {
				const globalOpts = creactOptionsWithSupabase(
					program.opts<GlobalOptions>(),
				);

				const items = pipe(
					options.mints,
					EffectArray.zip(options.amounts),
					EffectArray.zipWith(options.pods, ([mint, amount], cargoPodKind) => ({
						resourceMint: mint,
						amount: Match.value(amount).pipe(
							Match.when("full", () => "full" as const),
							Match.orElse(Number),
						),
						cargoPodKind,
					})),
				);

				const parsedItems = itemsDecoder.parse(items);

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
		.addOption(
			new Option("--pods <pods...>", "Fleet cargo pods type")
				.choices(cargoPodKinds)
				.makeOptionMandatory(true),
		)
		.action(
			async (
				fleetNameOrAddress: string,
				options: {
					mints: string[];
					amounts: string[];
					pods: CargoPodKind[];
				},
			) => {
				const globalOpts = creactOptionsWithSupabase(
					program.opts<GlobalOptions>(),
				);

				const items = pipe(
					options.mints,
					EffectArray.zip(options.amounts),
					EffectArray.zipWith(options.pods, ([mint, amount], cargoPodKind) => ({
						resourceMint: mint,
						amount: Match.value(amount).pipe(
							Match.when("full", () => "full" as const),
							Match.orElse(Number),
						),
						cargoPodKind,
					})),
				);

				const parsedItems = itemsDecoder.parse(items);

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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
			);

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
			const globalOpts = creactOptionsWithSupabase(
				program.opts<GlobalOptions>(),
			);

			return runUndock({
				...globalOpts,
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
				...globalOpts,
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
				...globalOpts,
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
				...globalOpts,
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
				...globalOpts,
				targetSector: targetSector.map(Number) as [number, number],
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

	await program.parseAsync(process.argv);
};

main();
