import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect } from "effect";
import {
	fetchFleetAccount,
	fetchFleetAccountByNameOrAddress,
} from "~/libs/@staratlas/sage";
import { createSubwarpToCoordinateIx } from "../fleet/instructions";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { GameService } from "../services/GameService";
import { getGameContext } from "../services/GameService/utils";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

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
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

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
			Effect.bind("drainVaultIx", () => createDrainVaultIx()),
			// Sending the transactions before doing the next step
			Effect.flatMap(({ preIxs, drainVaultIx }) =>
				GameService.buildAndSignTransaction({
					ixs: preIxs,
					afterIxs: drainVaultIx,
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

		const freshFleetAccount = yield* fetchFleetAccount(preFleetAccount.key);

		const subwarpIxs = yield* createSubwarpToCoordinateIx({
			fleetAccount: freshFleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		if (!subwarpIxs.length) {
			yield* Effect.log("Fleet already in target sector. Skipping");
			return { signatures: preIxsSignatures };
		}

		const drainVaultIx = yield* createDrainVaultIx();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs: subwarpIxs,
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const signatures = yield* GameService.sendAllTransactions(txs);

		yield* Effect.log(
			`Subwarping to - X: ${targetSectorX} | Y: ${targetSectorY}`,
		);

		return { signatures: [...preIxsSignatures, ...signatures] };
	});
