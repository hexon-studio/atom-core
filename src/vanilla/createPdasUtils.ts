import type { ManagedRuntime } from "effect";
import type { GameService } from "~/core/services/GameService";
import type { SolanaService } from "~/core/services/SolanaService";
import { findCargoPodPda } from "~/libs/@staratlas/cargo/pdas";
import {
	findCraftableItemPda,
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting/pdas";
import { findUserPointsPda } from "~/libs/@staratlas/points/pdas";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction/pdas";
import {
	findFleetPdaByName,
	findMineItemPda,
	findResourcePda,
	findSagePlayerProfilePda,
	findSectorPdaByCoordinates,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
} from "~/libs/@staratlas/sage/pdas";
import { makeVanilla } from "./makeVanilla";

export const createPdasUtils = (
	runtime: ManagedRuntime.ManagedRuntime<SolanaService | GameService, never>,
) => ({
	findFleetPdaByName: makeVanilla(findFleetPdaByName, runtime),
	findMineItemPda: makeVanilla(findMineItemPda, runtime),
	findResourcePda: makeVanilla(findResourcePda, runtime),
	findSagePlayerProfilePda: makeVanilla(findSagePlayerProfilePda, runtime),
	findSectorPdaByCoordinates: makeVanilla(findSectorPdaByCoordinates, runtime),
	findStarbasePdaByCoordinates: makeVanilla(
		findStarbasePdaByCoordinates,
		runtime,
	),
	findStarbasePlayerPda: makeVanilla(findStarbasePlayerPda, runtime),
	findCraftableItemPda: makeVanilla(findCraftableItemPda, runtime),
	findCraftingInstancePda: makeVanilla(findCraftingInstancePda, runtime),
	findCraftingProcessPda: makeVanilla(findCraftingProcessPda, runtime),
	findUserPointsPda: makeVanilla(findUserPointsPda, runtime),
	findProfileFactionPda: makeVanilla(findProfileFactionPda, runtime),
	findCargoPodPda: makeVanilla(findCargoPodPda, runtime),
});
