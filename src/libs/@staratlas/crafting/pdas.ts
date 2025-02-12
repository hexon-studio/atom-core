import type { PublicKey } from "@solana/web3.js";
import { CraftableItem, CraftingProcess } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";

export const findCraftingProcessPda = ({
	craftingFacility,
	craftingId,
	craftingRecipe,
}: {
	craftingFacility: PublicKey;
	craftingId: BN;
	craftingRecipe: PublicKey;
}) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() =>
				CraftingProcess.findAddress(
					programs.crafting,
					craftingFacility,
					craftingRecipe,
					craftingId,
				),
			),
		),
	);

export const findCraftingInstancePda = ({
	starbasePlayer,
	craftingProcess,
}: { starbasePlayer: PublicKey; craftingProcess: PublicKey }) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() =>
				CraftingInstance.findAddress(
					programs.sage,
					starbasePlayer,
					craftingProcess,
				),
			),
		),
	);

export const findCraftableItemPda = (itemMint: PublicKey) =>
	Effect.all([getGameContext(), getSagePrograms()]).pipe(
		Effect.flatMap(([context, programs]) =>
			Effect.try(() =>
				CraftableItem.findAddress(
					programs.crafting,
					context.gameInfo.game.data.crafting.domain,
					itemMint,
				),
			),
		),
	);
