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

		let fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* createPreIxs({ fleetAccount, target: "Idle" });

		if (preIxs.length) {
			// NOTE: get a fresh fleet account
			fleetAccount = yield* getFleetAccount(fleetAccount.key);
		}

		ixs.push(...preIxs);

		const subwarpIxs = yield* createSubwarpToCoordinateIx({
			fleetAccount,
			targetSector: [new BN(targetSectorX), new BN(targetSectorY)],
		});

		if (!subwarpIxs.length) {
			yield* Effect.log("Fleet already in target sector. Skipping");

			return [];
		}

		ixs.push(...subwarpIxs);

		const drainVaultIx = yield* createDrainVaultIx();

		const {
			options: { maxIxsPerTransaction },
		} = yield* getGameContext();

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			afterIxs: drainVaultIx,
			size: maxIxsPerTransaction,
		});

		const txId = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log(
			`Subwarping to - X: ${targetSectorX} | Y: ${targetSectorY}`,
		);

		return txId;
	});
