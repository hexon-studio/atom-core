import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
import { Effect, Match, pipe } from "effect";
import { isPublicKey } from "../../utils/public-key";
import {
	createStopMiningIx,
	createSubwarpToCoordinateIx,
	createUndockFromStarbaseIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import {
	getFleetAccount,
	getMineItemAccount,
	getResourceAccount,
} from "../utils/accounts";
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

		const fleetAccount = yield* getFleetAccount(fleetAddress);

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
						Effect.flatMap((mineItem) =>
							createStopMiningIx({
								resourceMint: mineItem.data.mint,
								fleetAccount,
							}),
						),
					),
			),
			Match.when({ StarbaseLoadingBay: Match.defined }, () =>
				createUndockFromStarbaseIx(fleetAccount).pipe(Effect.map((ix) => [ix])),
			),
			Match.orElse(() => Effect.succeed([] as InstructionReturn[])),
		);

		ixs.push(...preIxs);

		const subwarpIxs = yield* createSubwarpToCoordinateIx({
			fleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		ixs.push(...subwarpIxs);

		const gameService = yield* GameService;

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txId = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		console.log(`Subwarping to - X: ${targetSectorX} | Y: ${targetSectorY}`);

		return txId;
	});
