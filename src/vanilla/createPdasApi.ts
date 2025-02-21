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
import { toVanillaError } from "./toVanillaError";

export const createPdasApi = (
	runtime: ManagedRuntime.ManagedRuntime<SolanaService | GameService, never>,
) => {
	return {
		findCraftableItemPda: (...args: Parameters<typeof findCraftableItemPda>) =>
			findCraftableItemPda(...args).pipe(toVanillaError, runtime.runPromise),
		findCraftingInstancePda: (
			...args: Parameters<typeof findCraftingInstancePda>
		) =>
			findCraftingInstancePda(...args).pipe(toVanillaError, runtime.runPromise),
		findCraftingProcessPda: (
			...args: Parameters<typeof findCraftingProcessPda>
		) =>
			findCraftingProcessPda(...args).pipe(toVanillaError, runtime.runPromise),
		findCargoPodPda: (...args: Parameters<typeof findCargoPodPda>) =>
			findCargoPodPda(...args).pipe(toVanillaError, runtime.runPromise),
		findFleetPdaByName: (...args: Parameters<typeof findFleetPdaByName>) =>
			findFleetPdaByName(...args).pipe(toVanillaError, runtime.runPromise),
		findMineItemPda: (...args: Parameters<typeof findMineItemPda>) =>
			findMineItemPda(...args).pipe(toVanillaError, runtime.runPromise),
		findProfileFactionPda: (
			...args: Parameters<typeof findProfileFactionPda>
		) =>
			findProfileFactionPda(...args).pipe(toVanillaError, runtime.runPromise),
		findResourcePda: (...args: Parameters<typeof findResourcePda>) =>
			findResourcePda(...args).pipe(toVanillaError, runtime.runPromise),
		findSagePlayerProfilePda: (
			...args: Parameters<typeof findSagePlayerProfilePda>
		) =>
			findSagePlayerProfilePda(...args).pipe(
				toVanillaError,
				runtime.runPromise,
			),
		findSectorPdaByCoordinates: (
			...args: Parameters<typeof findSectorPdaByCoordinates>
		) =>
			findSectorPdaByCoordinates(...args).pipe(
				toVanillaError,
				runtime.runPromise,
			),
		findStarbasePdaByCoordinates: (
			...args: Parameters<typeof findStarbasePdaByCoordinates>
		) =>
			findStarbasePdaByCoordinates(...args).pipe(
				toVanillaError,
				runtime.runPromise,
			),
		findStarbasePlayerPda: (
			...args: Parameters<typeof findStarbasePlayerPda>
		) =>
			findStarbasePlayerPda(...args).pipe(toVanillaError, runtime.runPromise),
		findUserPointsPda: (...args: Parameters<typeof findUserPointsPda>) =>
			findUserPointsPda(...args).pipe(toVanillaError, runtime.runPromise),
	};
};
