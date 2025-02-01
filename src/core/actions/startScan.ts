import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { BN } from "bn.js";
import { Effect, Option, Record } from "effect";
import { resourceNameToMint } from "~/constants/resources";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { getFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import {
	FleetScanCooldownError,
	NotEnoughCargoSpaceForScanError,
	NotEnoughFoodForScanError,
} from "../fleet/errors";
import { createPreIxs } from "../fleet/instructions/createPreIxs";
import { createScanIx } from "../fleet/instructions/createScanIx";
import { GameService } from "../services/GameService";

export const startScan = ({
	fleetNameOrAddress,
}: {
	fleetNameOrAddress: string | PublicKey;
}) =>
	Effect.gen(function* () {
		yield* Effect.log("Start scanning...");

		const fleetAccount =
			yield* getFleetAccountByNameOrAddress(fleetNameOrAddress);

		const isScanCooldown = fleetAccount.data.scanCooldownExpiresAt.gt(
			new BN(Math.floor(Date.now() / 1000)),
		);

		if (isScanCooldown) {
			yield* Effect.log("Scan is on cooldown");

			return yield* Effect.fail(
				new FleetScanCooldownError({
					scanCooldownExpiresAt: new Date(
						fleetAccount.data.scanCooldownExpiresAt.toNumber() * 1000,
					).toISOString(),
				}),
			);
		}

		const scanCost = (fleetAccount.data.stats.miscStats as { scanCost: number })
			.scanCost;
		const sduPerScan = (
			fleetAccount.data.stats.miscStats as {
				sduPerScan: number;
			}
		).sduPerScan;

		if (scanCost) {
			const foodAmount = yield* getFleetCargoPodInfoByType({
				type: "cargo_hold",
				fleetAccount,
			}).pipe(
				Effect.map((info) => info.resources),
				Effect.map(Record.get(resourceNameToMint.Food.toString())),
				Effect.map(Option.map((resource) => resource.amountInTokens)),
				Effect.map(Option.getOrElse(() => new BN(0))),
			);

			const hasEnoughFood = foodAmount.gte(new BN(scanCost));

			if (!hasEnoughFood) {
				yield* Effect.log("Not enough food for scan");

				return yield* new NotEnoughFoodForScanError({
					foodAmount: foodAmount.toString(),
					scanCost: String(scanCost),
				});
			}
		}

		const hasEnoughCargoSpace = yield* getFleetCargoPodInfoByType({
			type: "cargo_hold",
			fleetAccount,
		}).pipe(
			Effect.map((info) => {
				const diff = info.maxCapacityInCargoUnits.sub(
					info.totalResourcesAmountInCargoUnits,
				);
				return diff.gte(new BN(sduPerScan));
			}),
		);

		if (!hasEnoughCargoSpace) {
			yield* Effect.log("Not enough cargo space for scan");

			return yield* new NotEnoughCargoSpaceForScanError();
		}

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* createPreIxs({ fleetAccount, target: "Idle" });

		ixs.push(...preIxs);

		const startScanIxs = yield* createScanIx({
			fleetAccount,
		});

		ixs.push(...startScanIxs);

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			size: 1, // NOTE: scan should be done in a single transaction
		});

		const txIds = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Scan started!");

		return txIds;
	});
