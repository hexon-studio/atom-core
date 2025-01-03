import { PublicKey } from "@solana/web3.js";
import { Effect, ManagedRuntime } from "effect";
import { type ResourceName, resourceNameToMint } from "./constants/resources";
import { dockToStarbase } from "./core/actions/dockToStarbase";
import { loadCargo } from "./core/actions/loadCargo";
import { startMining } from "./core/actions/startMining";
import { stopMining } from "./core/actions/stopMining";
import { subwarpToSector } from "./core/actions/subwarpToSector";
import { undockFromStarbase } from "./core/actions/undockFromStarbase";
import { unloadCargo } from "./core/actions/unloadCargo";
import { warpToSector } from "./core/actions/warpToSector";
import { GameService } from "./core/services/GameService";
import { getFleetAccountByNameOrAddress } from "./libs/@staratlas/sage";
import type { RequiredOptions } from "./types";
import { createMainLiveService } from "./utils/createLiveService";
import { parseSecretKey } from "./utils/keypair";

export const createAtomApi = (
	options: Omit<RequiredOptions, "logDisabled">,
) => {
	const appLayer = createMainLiveService({ ...options, logDisabled: true });

	const runtime = ManagedRuntime.make(appLayer);

	const { keypair, owner, playerProfile } = options;

	return {
		init: () =>
			GameService.pipe(
				Effect.flatMap((service) =>
					service.initGame({
						contextRef: service.gameContext,
						owner,
						playerProfile,
						signerAddress: keypair.publicKey,
					}),
				),
				runtime.runPromise,
			),
		dispose: () => runtime.dispose(),
		getFleet: (...args: Parameters<typeof getFleetAccountByNameOrAddress>) =>
			getFleetAccountByNameOrAddress(...args).pipe(runtime.runPromise),
		dock: (...args: Parameters<typeof dockToStarbase>) =>
			dockToStarbase(...args).pipe(runtime.runPromise),
		undock: (...args: Parameters<typeof undockFromStarbase>) =>
			undockFromStarbase(...args).pipe(runtime.runPromise),
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
				runtime.runPromise,
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
			loadCargo(...args).pipe(runtime.runPromise),
		unloadCargo: (...args: Parameters<typeof unloadCargo>) =>
			unloadCargo(...args).pipe(runtime.runPromise),
		subwarp: (...args: Parameters<typeof subwarpToSector>) =>
			subwarpToSector(...args).pipe(runtime.runPromise),
		warp: (...args: Parameters<typeof warpToSector>) =>
			warpToSector(...args).pipe(runtime.runPromise),
	};
};

const run = async () => {
	const apis = createAtomApi({
		feeMode: "high",
		keypair: parseSecretKey(
			"2JdbAoSGBs3hT5vZDKjYKyrnbFPWNwT8gv2XGthqzoyLJVqJXoCDXJEKK3h1uvBJHNwfEy2UfQXbPrdFdrNpsHhz",
		),
		owner: new PublicKey("HhDDM3vAWQ5scee7jnsMrENXYnYjqxNgRQfuqkaVMaiR"),
		playerProfile: new PublicKey(
			"4pisnW7EH8jYmzLTCcYPiVKqaKtRR1Aki4rRnk8B6yAd",
		),
		rpcUrl:
			"https://solana-mainnet.rpc.extrnode.com/0fc66c2a-d65e-4044-aa91-e8652c520ffc",
	});

	const fleetNameOrAddress = "Hapuka Fleet";

	await apis.init();

	const fleet = await apis.getFleet(fleetNameOrAddress);

	console.log({ fleet });

	await apis.dispose();
};

run();

// const signatures = await apis.undock({ fleetNameOrAddress });

// const miningSignatures = await apis.startMining({
// 	fleetNameOrAddress,
// 	resource: "Hydrogen",
// });

// const stopMiningSignatures = await apis.stopMining({
// 	fleetNameOrAddress,
// 	resource: "Hydrogen",
// });
