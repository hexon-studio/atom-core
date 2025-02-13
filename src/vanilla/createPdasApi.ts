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

export const createPdasApi = (
	runtime: ManagedRuntime.ManagedRuntime<SolanaService | GameService, never>,
) => {
	return {
		findCraftableItemPda: (...args: Parameters<typeof findCraftableItemPda>) =>
			findCraftableItemPda(...args).pipe(runtime.runPromise),
		findCraftingInstancePda: (
			...args: Parameters<typeof findCraftingInstancePda>
		) => findCraftingInstancePda(...args).pipe(runtime.runPromise),
		findCraftingProcessPda: (
			...args: Parameters<typeof findCraftingProcessPda>
		) => findCraftingProcessPda(...args).pipe(runtime.runPromise),
		findCargoPodPda: (...args: Parameters<typeof findCargoPodPda>) =>
			findCargoPodPda(...args).pipe(runtime.runPromise),
		findFleetPdaByName: (...args: Parameters<typeof findFleetPdaByName>) =>
			findFleetPdaByName(...args).pipe(runtime.runPromise),
		findMineItemPda: (...args: Parameters<typeof findMineItemPda>) =>
			findMineItemPda(...args).pipe(runtime.runPromise),
		findProfileFactionPda: (
			...args: Parameters<typeof findProfileFactionPda>
		) => findProfileFactionPda(...args).pipe(runtime.runPromise),
		findResourcePda: (...args: Parameters<typeof findResourcePda>) =>
			findResourcePda(...args).pipe(runtime.runPromise),
		findSagePlayerProfilePda: (
			...args: Parameters<typeof findSagePlayerProfilePda>
		) => findSagePlayerProfilePda(...args).pipe(runtime.runPromise),
		findSectorPdaByCoordinates: (
			...args: Parameters<typeof findSectorPdaByCoordinates>
		) => findSectorPdaByCoordinates(...args).pipe(runtime.runPromise),
		findStarbasePdaByCoordinates: (
			...args: Parameters<typeof findStarbasePdaByCoordinates>
		) => findStarbasePdaByCoordinates(...args).pipe(runtime.runPromise),
		findStarbasePlayerPda: (
			...args: Parameters<typeof findStarbasePlayerPda>
		) => findStarbasePlayerPda(...args).pipe(runtime.runPromise),
		findUserPointsPda: (...args: Parameters<typeof findUserPointsPda>) =>
			findUserPointsPda(...args).pipe(runtime.runPromise),
	};
};
