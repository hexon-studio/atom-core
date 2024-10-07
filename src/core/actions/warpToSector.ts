import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect } from "effect";
import { isPublicKey } from "../../utils/public-key";
import { createWarpToCoordinateIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";

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

		const ixs = yield* createWarpToCoordinateIx({
			fleetAddress,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txId = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log(`Warping to - X: ${targetSectorX} | Y: ${targetSectorY}`);

		return txId;
	});
