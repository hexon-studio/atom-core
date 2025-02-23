#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PublicKey } from "@solana/web3.js";
import {
	Effect,
	Array as EffectArray,
	String as EffectString,
	pipe,
} from "effect";
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

const fleetNameOrAddress = Args.text({ name: "fleet" }).pipe(
	Args.map((value) => (isPublicKey(value) ? new PublicKey(value) : value)),
	Args.withDescription("Fleet name or address"),
);

const atomFleetInfo = Command.make(
	"fleet-info",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap(
				makeFleetInfoCommand({
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Display detailed information about a fleet"));

const atomDock = Command.make(
	"dock",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap(
				makeDockCommand({
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Dock a fleet on the starbase"));

const atomUndock = Command.make(
	"undock",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap(
				makeUndockCommand({
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Undock a fleet from its current starbase"));

const resourceNameOrMint = Args.text({ name: "resource" }).pipe(
	Args.map((value) => (isPublicKey(value) ? new PublicKey(value) : value)),
	Args.withDescription("Resource name or mint address"),
);

const atomStartMining = Command.make(
	"start-mining",
	{ fleetNameOrAddress, resourceNameOrMint },
	({ fleetNameOrAddress, resourceNameOrMint }) =>
		atom.pipe(
			Effect.flatMap(
				makeStartMining({
					resourceNameOrMint,
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Start mining resources with a fleet"));

const atomStopMining = Command.make(
	"stop-mining",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap(
				makeStopMiningCommand({
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Stop the current mining operation"));

const loadItems = Options.text("resources").pipe(
	Options.atLeast(1),
	Options.map((items) =>
		pipe(
			EffectArray.map(items, EffectString.split(",")),
			EffectArray.map(([resourceMint, mode, amount, cargoPodKind]) =>
				loadResourceDecoder.parse({
					amount: Number(amount),
					cargoPodKind,
					mode,
					resourceMint,
				}),
			),
		),
	),
	Options.withDescription(
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
			Effect.flatMap(
				makeLoadCargoCommand({
					items: loadItems,
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Load resources into a fleet"));

const unloadItems = Options.text("resources").pipe(
	Options.atLeast(1),
	Options.map((items) =>
		pipe(
			EffectArray.map(items, EffectString.split(",")),
			EffectArray.map(([resourceMint, mode, amount, cargoPodKind]) =>
				unloadResourceDecoder.parse({
					amount: Number(amount),
					cargoPodKind,
					mode,
					resourceMint: new PublicKey(resourceMint),
				}),
			),
		),
	),
	Options.withDescription(
		[
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
			Effect.flatMap(
				makeUnloadCargoCommand({
					items: unloadItems,
					fleetNameOrAddress,
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
			Effect.flatMap(
				makeSubwarpCommand({
					targetSector,
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Subwarp a fleet to a different sector"));

const atomWarp = Command.make(
	"warp",
	{ fleetNameOrAddress, targetSector: sectorArgument },
	({ fleetNameOrAddress, targetSector }) =>
		atom.pipe(
			Effect.flatMap(
				makeWarpCommand({
					targetSector,
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Warp a fleet to a different sector"));

const crewAmount = Options.integer("crewAmount").pipe(
	Options.withAlias("c"),
	Options.withDescription("Number of crew members to load"),
);

const atomLoadCrew = Command.make(
	"load-crew",
	{ fleetNameOrAddress, crewAmount },
	({ fleetNameOrAddress, crewAmount }) =>
		atom.pipe(
			Effect.flatMap(
				makeLoadCrewCommand({
					crewAmount,
					fleetNameOrAddress,
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
			Effect.flatMap(
				makeUnloadCrewCommand({
					allowUnloadRequiredCrew,
					crewAmount,
					fleetNameOrAddress,
				}),
			),
		),
).pipe(Command.withDescription("Unload crew members from a fleet"));

const atomStartScan = Command.make(
	"start-scan",
	{ fleetNameOrAddress },
	({ fleetNameOrAddress }) =>
		atom.pipe(
			Effect.flatMap(
				makeStartScanCommand({
					fleetNameOrAddress,
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
			Effect.flatMap(
				makeProfileInfoCommand({
					playerProfile,
				}),
			),
		),
).pipe(
	Command.withDescription(
		"Display detailed information about a player profile",
	),
);

const atomRecipeList = Command.make("recipe-list", {}, () =>
	atom.pipe(Effect.flatMap(makeRecipeListCommand())),
).pipe(Command.withDescription("Get all the active crafting recipes accounts"));

const recipe = Options.text("recipe").pipe(
	Options.map((value) => new PublicKey(value)),
	Options.withDescription("Public key of the crafting recipe"),
);

const quantity = Options.integer("quantity").pipe(Options.withAlias("q"));

const starbaseCoords = Options.text("sector").pipe(
	Options.withDescription("Starbase sector coordinates (format: x,y)"),
	Options.map(EffectString.split(",")),
	Options.map(z.tuple([z.coerce.number(), z.coerce.number()]).parse),
);

const atomStartCrafting = Command.make(
	"start-crafting",
	{
		crewAmount,
		quantity,
		recipe,
		starbaseCoords,
	},
	({ starbaseCoords, crewAmount, recipe, quantity }) =>
		atom.pipe(
			Effect.flatMap(
				makeStartCraftingCommand({
					crewAmount,
					starbaseCoords,
					quantity,
					recipe,
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
		craftingId,
		recipe,
		starbaseCoords,
	},
	({ starbaseCoords, craftingId, recipe }) =>
		atom.pipe(
			Effect.flatMap(
				makeStopCraftingCommand({
					starbaseCoords,
					craftingId,
					recipe,
				}),
			),
		),
).pipe(Command.withDescription("Stop a completed crafting process"));

const command = atom.pipe(
	Command.withSubcommands([
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
		atomStartCrafting,
		atomStopCrafting,
		atomFleetInfo,
		atomRecipeList,
		atomPlayerProfile,
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
