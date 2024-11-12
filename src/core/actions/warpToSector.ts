import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
import { Effect, Match, pipe } from "effect";
import { isPublicKey } from "../../utils/public-key";
import {
	createStopMiningIx,
	createUndockFromStarbaseIx,
	createWarpToCoordinateIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import {
	getFleetAccount,
	getMineItemAccount,
	getResourceAccount,
} from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export const warpToSector = ({
	fleetNameOrAddress,
	targetSector: [targetSectorX, targetSectorY],
}: {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
}) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		console.log("Start warp...");
		let fleetAccount = yield* getFleetAccount(fleetAddress);

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* Match.value(fleetAccount.state).pipe(
			Match.when(
				{ MineAsteroid: Match.defined },
				({ MineAsteroid: { resource } }) =>
					pipe(
						getResourceAccount(resource),
						Effect.flatMap((resource) =>
							getMineItemAccount(resource.data.mineItem),
						),
						Effect.flatMap((mineItem) => {
							return createStopMiningIx({
								resourceMint: mineItem.data.mint,
								fleetAccount,
							});
						}),
					),
			),
			Match.when({ StarbaseLoadingBay: Match.defined }, () =>
				createUndockFromStarbaseIx(fleetAccount).pipe(Effect.map((ix) => [ix])),
			),
			Match.orElse(() => Effect.succeed([] as InstructionReturn[])),
		);

		if (preIxs.length) {
			// NOTE: get a fresh fleet account
			fleetAccount = yield* getFleetAccount(fleetAddress);
		}

		ixs.push(...preIxs);

		const warpIxs = yield* createWarpToCoordinateIx({
			fleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		ixs.push(...warpIxs);

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(...drainVaultIx);

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txId = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log(`Warping to - X: ${targetSectorX} | Y: ${targetSectorY}`);

		return txId;
	});
