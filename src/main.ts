import { Keypair, PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { type ResourceName, resourceNameToMint } from "./constants/resources";
import { dockToStarbase } from "./core/actions/dockToStarbase";
import { loadCargo } from "./core/actions/loadCargo";
import { startMining } from "./core/actions/startMining";
import { stopMining } from "./core/actions/stopMining";
import { subwarpToSector } from "./core/actions/subwarpToSector";
import { undockFromStarbase } from "./core/actions/undockFromStarbase";
import { unloadCargo } from "./core/actions/unloadCargo";
import { warpToSector } from "./core/actions/warpToSector";
import type { GameService } from "./core/services/GameService";
import type { SolanaService } from "./core/services/SolanaService";
import type { RequiredOptions } from "./types";
import { createMainLiveService } from "./utils/createLiveService";

export const createAtomApi = (options: RequiredOptions) => {
	const service = createMainLiveService(options);

	const provideAndRun = <A, E>(
		self: Effect.Effect<A, E, GameService | SolanaService>,
	) => self.pipe(Effect.provide(service));

	return {
		dock: (...args: Parameters<typeof dockToStarbase>) =>
			dockToStarbase(...args).pipe(provideAndRun),
		undock: (...args: Parameters<typeof undockFromStarbase>) =>
			undockFromStarbase(...args).pipe(provideAndRun),
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

			return startMining({ fleetNameOrAddress, resourceMint }).pipe(
				provideAndRun,
			);
		},
		stopMining: ({
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

			return stopMining({ fleetNameOrAddress, resourceMint });
		},
		loadCargo: (...args: Parameters<typeof loadCargo>) =>
			loadCargo(...args).pipe(provideAndRun),
		unloadCargo: (...args: Parameters<typeof unloadCargo>) =>
			unloadCargo(...args).pipe(provideAndRun),
		subwarp: (...args: Parameters<typeof subwarpToSector>) =>
			subwarpToSector(...args).pipe(provideAndRun),
		warp: (...args: Parameters<typeof warpToSector>) =>
			warpToSector(...args).pipe(provideAndRun),
	};
};

const apis = createAtomApi({
	feeMode: "high",
	keypair: Keypair.generate(),
	owner: new PublicKey(""),
	playerProfile: new PublicKey(""),
	rpcUrl: "Some rpc url",
});

const fleetNameOrAddress = "Hapuka Fleet";

const signatures = await apis.undock({ fleetNameOrAddress });

const miningSignatures = await apis.startMining({
	fleetNameOrAddress,
	resource: "Hydrogen",
});

const stopMiningSignatures = await apis.stopMining({
	fleetNameOrAddress,
	resource: "Hydrogen",
});
