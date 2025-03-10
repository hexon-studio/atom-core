import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import BN from "bn.js";
import { Effect } from "effect";
import {
	getFleetAccount,
	getFleetAccountByNameOrAddress,
} from "~/libs/@staratlas/sage";
import { createSubwarpToCoordinateIx } from "../fleet/instructions";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createAfterIxs } from "../vault/instructions/createAfterIxs";

export const subwarpToSector = ({
	fleetNameOrAddress,
	targetSector: [targetSectorX, targetSectorY],
}: {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
}) =>
	Effect.gen(function* () {
		yield* Effect.log("Start subwarp...");

		const preFleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		// yield* assertRentIsValid(preFleetAccount);

		const ixs: InstructionReturn[] = [];
		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const preIxsSignatures = yield* Effect.Do.pipe(
			Effect.bind("preIxs", () =>
				createPreIxs({
					fleetAccount: preFleetAccount,
					targetState: "Idle",
				}),
			),
			Effect.bind("afterIxs", () => createAfterIxs()),
			// Sending the transactions before doing the next step
			Effect.flatMap(({ preIxs, afterIxs }) =>
				GameService.buildAndSignTransaction({
					ixs: preIxs,
					afterIxs,
					size: maxIxsPerTransaction,
				}),
			),
			Effect.flatMap((txs) =>
				Effect.all(txs.map((tx) => GameService.sendTransaction(tx))),
			),
			Effect.tap((signatures) =>
				Effect.log("Fleet exit subwarp.").pipe(
					Effect.annotateLogs({ signatures }),
				),
			),
		);

		const freshFleetAccount = yield* getFleetAccount(preFleetAccount.key);
		const subwarpIxs = yield* createSubwarpToCoordinateIx({
			fleetAccount: freshFleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		if (!subwarpIxs.length) {
			yield* Effect.log("Fleet already in target sector. Skipping");
			return { signatures: preIxsSignatures };
		}

		ixs.push(...subwarpIxs);
		const afterIxs = yield* createAfterIxs();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log(
			`Subwarping to - X: ${targetSectorX} | Y: ${targetSectorY}`,
		);

		return { signatures: [...preIxsSignatures, ...signatures] };
	});
