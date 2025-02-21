import type { PublicKey } from "@solana/web3.js";
import { Effect, ManagedRuntime } from "effect";
import { type ResourceName, resourceNameToMint } from "~/constants/resources";
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
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { createMainLiveService } from "~/utils/createMainLiveService";
import {
	type ParsedGlobalOptions,
	createOptionsFromParsed,
} from "~/utils/globalOptions";
import { createPdasApi } from "./createPdasApi";
import { toVanillaError } from "./toVanillaError";

export const createAtomApi = (
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

	const pdas = createPdasApi(runtime);

	return {
		pdas,
		init: () =>
			GameService.pipe(
				Effect.flatMap((service) =>
					service.initGame(service.gameContext, globalOptions),
				),
				toVanillaError,
				runtime.runPromise,
			),
		dispose: () => runtime.dispose(),
		getFleet: (...args: Parameters<typeof getFleetAccountByNameOrAddress>) =>
			getFleetAccountByNameOrAddress(...args).pipe(
				toVanillaError,
				runtime.runPromise,
			),
		dock: (...args: Parameters<typeof dockToStarbase>) =>
			dockToStarbase(...args).pipe(toVanillaError, runtime.runPromise),
		undock: (...args: Parameters<typeof undockFromStarbase>) =>
			undockFromStarbase(...args).pipe(toVanillaError, runtime.runPromise),
		startCrafting: (...args: Parameters<typeof startCrafting>) =>
			startCrafting(...args).pipe(toVanillaError, runtime.runPromise),
		stopCrafting: (...args: Parameters<typeof stopCrafting>) =>
			stopCrafting(...args).pipe(toVanillaError, runtime.runPromise),
		startMining: ({
			fleetNameOrAddress,
			resource,
		}: {
			fleetNameOrAddress: string | PublicKey;
			resource: ResourceName | PublicKey;
		}) => {
			const resourceMint =
				typeof resource === "string"
					? resourceNameToMint[resource as ResourceName]
					: resource;

			return startMining({
				fleetNameOrAddress,
				resourceMint,
			}).pipe(toVanillaError, runtime.runPromise);
		},
		stopMining: (...args: Parameters<typeof stopMining>) =>
			stopMining(...args).pipe(toVanillaError, runtime.runPromise),
		loadCargo: (...args: Parameters<typeof loadCargo>) =>
			loadCargo(...args).pipe(toVanillaError, runtime.runPromise),
		loadCrew: (...args: Parameters<typeof loadCrew>) =>
			loadCrew(...args).pipe(toVanillaError, runtime.runPromise),
		unloadCrew: (...args: Parameters<typeof unloadCrew>) =>
			unloadCrew(...args).pipe(toVanillaError, runtime.runPromise),
		unloadCargo: (...args: Parameters<typeof unloadCargo>) =>
			unloadCargo(...args).pipe(toVanillaError, runtime.runPromise),
		subwarp: (...args: Parameters<typeof subwarpToSector>) =>
			subwarpToSector(...args).pipe(toVanillaError, runtime.runPromise),
		warp: (...args: Parameters<typeof warpToSector>) =>
			warpToSector(...args).pipe(toVanillaError, runtime.runPromise),
		startScan: (...args: Parameters<typeof startScan>) =>
			startScan(...args).pipe(toVanillaError, runtime.runPromise),
	};
};
