import { Effect, ManagedRuntime } from "effect";
import { dockToStarbase } from "~/core/actions/dockToStarbase";
import { loadCargo } from "~/core/actions/loadCargo";
import { loadCrew } from "~/core/actions/loadCrew";
import { startCrafting } from "~/core/actions/startCrafting";
import { startMining } from "~/core/actions/startMining";
import { startScan } from "~/core/actions/startScan";
import { stopCrafting } from "~/core/actions/stopCrafting";
import { stopMining } from "~/core/actions/stopMining";
import { subwarpToSector } from "~/core/actions/subwarpToSector";
import { undockFromStarbase } from "~/core/actions/undockFromStarbase";
import { unloadCargo } from "~/core/actions/unloadCargo";
import { unloadCrew } from "~/core/actions/unloadCrew";
import { warpToSector } from "~/core/actions/warpToSector";
import { GameService } from "~/core/services/GameService";
import { createMainLiveService } from "~/utils/createMainLiveService";
import {
	type ParsedGlobalOptions,
	createOptionsFromParsed,
} from "~/utils/globalOptions";
import { createAccountsUtils } from "./createAccountsUtils";
import { createPdasUtils } from "./createPdasUtils";
import { makeVanilla } from "./makeVanilla";

export const createAtom = (
	options: Omit<
		ParsedGlobalOptions,
		| "feeRecipient"
		| "feeAtlas"
		| "feeLamports"
		| "webhookUrl"
		| "webhookSecret"
		| "contextId"
	>,
) => {
	const globalOptions = createOptionsFromParsed(options);

	const appLayer = createMainLiveService(globalOptions);

	const runtime = ManagedRuntime.make(appLayer);

	const pdas = createPdasUtils(runtime);
	const accounts = createAccountsUtils(runtime);

	return {
		accounts,
		pdas,
		init: makeVanilla(
			() =>
				GameService.pipe(
					Effect.flatMap((service) =>
						service.initGame(service.gameContext, globalOptions),
					),
				),
			runtime,
		),
		dispose: () => runtime.dispose(),
		fleet: {
			dock: makeVanilla(dockToStarbase, runtime),
			loadCargo: makeVanilla(loadCargo, runtime),
			startMining: makeVanilla(startMining, runtime),
			startScan: makeVanilla(startScan, runtime),
			stopMining: makeVanilla(stopMining, runtime),
			subwarp: makeVanilla(subwarpToSector, runtime),
			undock: makeVanilla(undockFromStarbase, runtime),
			unloadCargo: makeVanilla(unloadCargo, runtime),
			warp: makeVanilla(warpToSector, runtime),
		},
		starbase: {
			loadCrew: makeVanilla(loadCrew, runtime),
			startCrafting: makeVanilla(startCrafting, runtime),
			stopCrafting: makeVanilla(stopCrafting, runtime),
			unloadCrew: makeVanilla(unloadCrew, runtime),
		},
	};
};
