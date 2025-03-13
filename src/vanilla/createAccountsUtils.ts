import type { ManagedRuntime } from "effect";
import type { GameService } from "~/core/services/GameService";
import type { SolanaService } from "~/core/services/SolanaService";
import {
	fetchCargoPodAccount,
	fetchCargoStatsDefinitionAccount,
	fetchCargoTypeAccount,
} from "~/libs/@staratlas/cargo/accounts";
import {
	fetchCraftingFacilityAccount,
	fetchRecipeAccount,
} from "~/libs/@staratlas/crafting/accounts";
import { fetchPlayerProfileAccount } from "~/libs/@staratlas/player-profile/accounts";
import {
	fetchFleetAccount,
	fetchFleetAccountByNameOrAddress,
	fetchFleetAccountsByPlayerProfile,
	fetchGameAccount,
	fetchMineItemAccount,
	fetchPlanetAccount,
	fetchResourceAccount,
	fetchSectorAccount,
	fetchStarbaseAccount,
	fetchStarbasePlayerAccount,
} from "~/libs/@staratlas/sage/accounts";
import { makeVanilla } from "./makeVanilla";

export const createAccountsUtils = (
	runtime: ManagedRuntime.ManagedRuntime<SolanaService | GameService, never>,
) => ({
	fetchCargoPodAccount: makeVanilla(fetchCargoPodAccount, runtime),
	fetchCargoStatsDefinitionAccount: makeVanilla(
		fetchCargoStatsDefinitionAccount,
		runtime,
	),
	fetchCargoTypeAccount: makeVanilla(fetchCargoTypeAccount, runtime),
	fetchCraftingFacilityAccount: makeVanilla(
		fetchCraftingFacilityAccount,
		runtime,
	),
	fetchFleetAccount: makeVanilla(fetchFleetAccount, runtime),
	fetchFleetAccountByNameOrAddress: makeVanilla(
		fetchFleetAccountByNameOrAddress,
		runtime,
	),
	fetchGameAccount: makeVanilla(fetchGameAccount, runtime),
	fetchMineItemAccount: makeVanilla(fetchMineItemAccount, runtime),
	fetchPlanetAccount: makeVanilla(fetchPlanetAccount, runtime),
	fetchPlayerProfileAccount: makeVanilla(fetchPlayerProfileAccount, runtime),
	fetchRecipeAccount: makeVanilla(fetchRecipeAccount, runtime),
	fetchResourceAccount: makeVanilla(fetchResourceAccount, runtime),
	fetchSectorAccount: makeVanilla(fetchSectorAccount, runtime),
	fetchStarbaseAccount: makeVanilla(fetchStarbaseAccount, runtime),
	fetchStarbasePlayerAccount: makeVanilla(fetchStarbasePlayerAccount, runtime),
	fetchFleetAccountsByPlayerProfile: makeVanilla(
		fetchFleetAccountsByPlayerProfile,
		runtime,
	),
});
