#!/usr/bin/env node

import { Keypair, PublicKey } from "@solana/web3.js";
import { Command, InvalidArgumentError, Option } from "commander";
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
import { runLoadCargo } from "./commands/loadCargo";
import { runStartMining } from "./commands/startMining";
import { runStopMining } from "./commands/stopMining";
import { runSubwarp } from "./commands/subwarp";
import { runUndock } from "./commands/undock";
import { runUnloadCargo } from "./commands/unloadCargo";
import { runWarp } from "./commands/warp";
import { noopPublicKey } from "./constants/tokens";
import { type GlobalOptions, cargoPodKindDecoder } from "./types";
import { parseSecretKey } from "./utils/keypair";
import { isPublicKey, parsePublicKey } from "./utils/public-key";

const main = async () => {
	const program = new Command("atom")
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
		.option("--verbose", "Print additional logs", false);

	const itemsDecoder = z.array(
		z.object({
			resourceMint: z.string(),
			amount: z.union([z.literal("full"), z.number()]),
			cargoPodKind: cargoPodKindDecoder,
		}),
	);

	program
		.setOptionValue("owner", noopPublicKey)
		.setOptionValue("keypair", Keypair.generate())
		.command("fleet-info <fleetNameOrAddress>")
		.action(async (fleetNameOrAddress: string) => {
			const globalOpts = program.opts<GlobalOptions>();

			return runFleetInfo({
				...globalOpts,
				fleetNameOrAddress: isPublicKey(fleetNameOrAddress)
					? new PublicKey(fleetNameOrAddress)
					: fleetNameOrAddress,
			});
		});

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
				const globalOpts = program.opts<GlobalOptions>();

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
				const globalOpts = program.opts<GlobalOptions>();

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
			const globalOpts = program.opts<GlobalOptions>();

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
			const globalOpts = program.opts<GlobalOptions>();

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
			const globalOpts = program.opts<GlobalOptions>();

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
			const globalOpts = program.opts<GlobalOptions>();

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
			const globalOpts = program.opts<GlobalOptions>();

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
			const globalOpts = program.opts<GlobalOptions>();

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
