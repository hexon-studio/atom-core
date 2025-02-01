import type { PublicKey } from "@solana/web3.js";
import { Effect, ManagedRuntime } from "effect";
import { type ResourceName, resourceNameToMint } from "~/constants/resources";
import { dockToStarbase } from "~/core/actions/dockToStarbase";
import { loadCargo } from "~/core/actions/loadCargo";
import { loadCrew } from "~/core/actions/loadCrew";
import { startMining } from "~/core/actions/startMining";
import { startScan } from "~/core/actions/startScan";
import { stopMining } from "~/core/actions/stopMining";
import { subwarpToSector } from "~/core/actions/subwarpToSector";
import { undockFromStarbase } from "~/core/actions/undockFromStarbase";
import { unloadCargo } from "~/core/actions/unloadCargo";
import { unloadCrew } from "~/core/actions/unloadCrew";
import { warpToSector } from "~/core/actions/warpToSector";
import { GameService } from "~/core/services/GameService";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import type { RequiredOptions } from "~/types";
import { createMainLiveService } from "~/utils/createMainLiveService";
import { createPdasApi } from "./pda";

export const createAtomApi = (
	options: Omit<RequiredOptions, "logDisabled">,
) => {
	const appLayer = createMainLiveService({
		...options,
		logDisabled: true,
	});

	const runtime = ManagedRuntime.make(appLayer);

	const pdas = createPdasApi(runtime);

	return {
		pdas,
		init: () =>
			GameService.pipe(
				Effect.flatMap((service) =>
					service.initGame(service.gameContext, options),
				),
				runtime.runPromise,
			),
		dispose: () => runtime.dispose(),
		getFleet: (...args: Parameters<typeof getFleetAccountByNameOrAddress>) =>
			getFleetAccountByNameOrAddress(...args).pipe(runtime.runPromise),
		dock: (...args: Parameters<typeof dockToStarbase>) =>
			dockToStarbase(...args).pipe(runtime.runPromise),
		undock: (...args: Parameters<typeof undockFromStarbase>) =>
			undockFromStarbase(...args).pipe(
				// Effect.either,
				// Effect.map(
				// 	Either.match({
				// 		onRight: (signatures) => [signatures, undefined] as const,
				// 		onLeft: (error) => [undefined, error] as const,
				// 	}),
				// ),
				runtime.runPromise,
			),
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
			}).pipe(runtime.runPromise);
		},
		stopMining: (...args: Parameters<typeof stopMining>) =>
			stopMining(...args).pipe(runtime.runPromise),
		loadCargo: (...args: Parameters<typeof loadCargo>) =>
			loadCargo(...args).pipe(runtime.runPromise),
		loadCrew: (...args: Parameters<typeof loadCrew>) =>
			loadCrew(...args).pipe(runtime.runPromise),
		unloadCrew: (...args: Parameters<typeof unloadCrew>) =>
			unloadCrew(...args).pipe(runtime.runPromise),
		unloadCargo: (...args: Parameters<typeof unloadCargo>) =>
			unloadCargo(...args).pipe(runtime.runPromise),
		subwarp: (...args: Parameters<typeof subwarpToSector>) =>
			subwarpToSector(...args).pipe(runtime.runPromise),
		warp: (...args: Parameters<typeof warpToSector>) =>
			warpToSector(...args).pipe(runtime.runPromise),
		startScan: (...args: Parameters<typeof startScan>) =>
			startScan(...args).pipe(runtime.runPromise),
	};
};
