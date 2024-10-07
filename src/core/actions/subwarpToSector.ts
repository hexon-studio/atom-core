import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect } from "effect";
import { isPublicKey } from "../../utils/public-key";
import { createSubwarpToCoordinateIx } from "../fleet/instructions";
import { GameService } from "../services/GameService";
import { getFleetAddressByName } from "../utils/pdas";

export const subwarpToSector = ({
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

		console.log("Start subwarp...");

		const ixs = yield* createSubwarpToCoordinateIx({
			fleetAddress,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txId = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log(`Subwarping to - X: ${targetSectorX} | Y: ${targetSectorY}`);

		return txId;
	});
