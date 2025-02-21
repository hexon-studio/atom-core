#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PublicKey } from "@solana/web3.js";
import { Effect, String as EffectString, pipe } from "effect";
import { z } from "zod";
import { version as packageJsonVersion } from "../package.json";
import {
	makeDockCommand,
	makeFleetInfoCommand,
	makeLoadCargoCommand,
	makeLoadCrewCommand,
	makeProfileInfoCommand,
	makeRecipeListCommand,
	makeStartCraftingCommand,
	makeStartMining,
	makeStartScanCommand,
	makeStopCraftingCommand,
	makeStopMiningCommand,
	makeSubwarpCommand,
	makeUndockCommand,
	makeUnloadCargoCommand,
	makeUnloadCrewCommand,
	makeWarpCommand,
} from "./commands";
import {
	cargoPodKinds,
	loadResourceDecoder,
	unloadResourceDecoder,
} from "./utils/decoders";
import { globalOptions } from "./utils/globalOptions";
import { isPublicKey } from "./utils/public-key";

const atom = Command.make("atom", globalOptions);

const fleetNameOrAddress = Args.text({ name: "fleetNameOrAddress" }).pipe(
	Args.map((value) => (isPublicKey(value) ? new PublicKey(value) : value)),
);

const atomFleetInfo = Command.make(
	"fleet-info",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeFleetInfoCommand({
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Display detailed information about a fleet"));

const atomDock = Command.make(
	"dock",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeDockCommand({
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Dock a fleet on the starbase"));

const atomUndock = Command.make(
	"undock",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeUndockCommand({
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Undock a fleet from its current starbase"));

const resourceMint = Args.text({ name: "resourceMint" }).pipe(
	Args.map((value) => new PublicKey(value)),
);

const atomStartMining = Command.make(
	"start-mining",
	{ fleetNameOrAddress, resourceMint },
	({ fleetNameOrAddress, resourceMint }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeStartMining({
					resourceMint,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Start mining resources with a fleet"));

const atomStopMining = Command.make(
	"stop-mining",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeStopMiningCommand({
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Stop the current mining operation"));

const loadItems = Args.text({ name: "resources" }).pipe(
	Args.map((item) =>
		pipe(
			item,
			EffectString.split(","),
			([resourceMint, mode, amount, cargoPodKind]) =>
				loadResourceDecoder.parse({
					amount: Number(amount),
					cargoPodKind,
					mode,
					resourceMint: new PublicKey(resourceMint),
				}),
		),
	),
	Args.atLeast(1),
	Args.withDescription(
		[
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
	),
);

const atomLoadCargo = Command.make(
	"load-cargo",
	{ fleetNameOrAddress, loadItems },
	({ fleetNameOrAddress, loadItems }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeLoadCargoCommand({
					items: loadItems,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Load resources into a fleet"));

const unloadItems = Args.text({ name: "resources" }).pipe(
	Args.map((item) =>
		pipe(
			item,
			EffectString.split(","),
			([resourceMint, mode, amount, cargoPodKind]) =>
				unloadResourceDecoder.parse({
					amount: Number(amount),
					cargoPodKind,
					mode,
					resourceMint: new PublicKey(resourceMint),
				}),
		),
	),
	Args.atLeast(1),
	Args.withDescription(
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
	),
);

const atomUnloadCargo = Command.make(
	"unload-cargo",
	{ fleetNameOrAddress, unloadItems },
	({ fleetNameOrAddress, unloadItems }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeUnloadCargoCommand({
					items: unloadItems,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Unload cargo from a fleet"));

const sectorArgument = Args.text({ name: "target-sector" }).pipe(
	Args.withDescription("Target sector coordinates (format: x,y)"),
	Args.map(EffectString.split(",")),
	Args.map(z.tuple([z.coerce.number(), z.coerce.number()]).parse),
);

const atomSubwarp = Command.make(
	"subwarp",
	{ fleetNameOrAddress, targetSector: sectorArgument },
	({ fleetNameOrAddress, targetSector }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeSubwarpCommand({
					targetSector,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Subwarp a fleet to a different sector"));

const atomWarp = Command.make(
	"warp",
	{ fleetNameOrAddress, targetSector: sectorArgument },
	({ fleetNameOrAddress, targetSector }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeWarpCommand({
					targetSector,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Warp a fleet to a different sector"));

const crewAmount = Args.integer({ name: "crew-amount" }).pipe(
	Args.withDescription("Number of crew members to load"),
);

const atomLoadCrew = Command.make(
	"load-crew",
	{ fleetNameOrAddress, crewAmount },
	({ fleetNameOrAddress, crewAmount }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeLoadCrewCommand({
					crewAmount,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Load crew members into a fleet"));

const allowUnloadRequiredCrew = Options.boolean(
	"allow-unload-required-crew",
).pipe(
	Options.withDescription(
		"Allow unloading crew members required for fleet operation (use with caution)",
	),
);

const atomUnloadCrew = Command.make(
	"unload-crew",
	{ fleetNameOrAddress, crewAmount, allowUnloadRequiredCrew },
	({ fleetNameOrAddress, crewAmount, allowUnloadRequiredCrew }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeUnloadCrewCommand({
					allowUnloadRequiredCrew,
					crewAmount,
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Unload crew members from a fleet"));

const atomStartScan = Command.make(
	"start-scan",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeStartScanCommand({
					fleetNameOrAddress,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(
	Command.withDescription("Start scanning the current sector with a fleet"),
);

const playerProfile = Args.text({ name: "player-profile" }).pipe(
	Args.map((value) => new PublicKey(value)),
	Args.optional,
);

const atomPlayerProfile = Command.make(
	"profile-info",
	{ playerProfile },
	({ playerProfile }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeProfileInfoCommand({
					playerProfile,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(
	Command.withDescription(
		"Display detailed information about a player profile",
	),
);

const atomRecipeList = Command.make("recipe-list", {}, () =>
	atom.pipe(
		Effect.flatMap((cliGlobalOpts) =>
			makeRecipeListCommand({
				globalOpts: cliGlobalOpts,
			}),
		),
	),
).pipe(Command.withDescription("Get all the active crafting recipes accounts"));

const recipe = Options.text("recipe").pipe(
	Options.map((value) => new PublicKey(value)),
);

const quantity = Options.integer("quantity");

const starbaseCoords = Options.text("sector").pipe(
	Options.withDescription("Starbase sector coordinates (format: x,y)"),
	Options.map(EffectString.split(",")),
	Options.map(z.tuple([z.coerce.number(), z.coerce.number()]).parse),
);

const atomStartCrafting = Command.make(
	"start-crafting",
	{
		starbaseCoords,
		crewAmount,
		recipe,
		quantity,
	},
	({ starbaseCoords, crewAmount, recipe, quantity }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeStartCraftingCommand({
					crewAmount,
					starbaseCoords,
					quantity,
					recipe,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Start crafting items at a starbase"));

const craftingId = Options.integer("craftingId").pipe(
	Options.withAlias("cid"),
	Options.withDescription("ID of the crafting process to stop"),
);

const atomStopCrafting = Command.make(
	"stop-crafting",
	{
		starbaseCoords,
		craftingId,
		recipe,
	},
	({ starbaseCoords, craftingId, recipe }) =>
		atom.pipe(
			Effect.flatMap((cliGlobalOpts) =>
				makeStopCraftingCommand({
					starbaseCoords,
					craftingId,
					recipe,
					globalOpts: cliGlobalOpts,
				}),
			),
		),
).pipe(Command.withDescription("Stop a completed crafting process"));

const command = atom.pipe(
	Command.withSubcommands([
		atomFleetInfo,
		atomDock,
		atomUndock,
		atomStartMining,
		atomStopMining,
		atomLoadCargo,
		atomUnloadCargo,
		atomSubwarp,
		atomWarp,
		atomLoadCrew,
		atomUnloadCrew,
		atomStartScan,
		atomPlayerProfile,
		atomRecipeList,
		atomStartCrafting,
		atomStopCrafting,
	]),
);

// Initialize and run the CLI application
const cli = Command.run(command, {
	name: "Atom Core CLI",
	version: packageJsonVersion,
});

cli(process.argv).pipe(
	Effect.provide(NodeContext.layer),
	NodeRuntime.runMain({
		disablePrettyLogger: true,
	}),
);
