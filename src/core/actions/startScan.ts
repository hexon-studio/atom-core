import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import type { MiscStats } from "@staratlas/sage";
import { BN } from "bn.js";
import { Effect, Option, Record, pipe } from "effect";
import { getFleetCargoPodInfoByType } from "~/libs/@staratlas/cargo";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { resourceMintByName } from "~/utils";
import {
	FleetCooldownError,
	NotEnoughCargoSpaceForScanError,
	NotEnoughFoodForScanError,
} from "../../errors";
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
			yield* fetchFleetAccountByNameOrAddress(fleetNameOrAddress);

		// yield* assertRentIsValid(fleetAccount);

		const isScanCooldown = fleetAccount.data.scanCooldownExpiresAt.gt(
			new BN(Math.floor(Date.now() / 1000)),
		);

		if (isScanCooldown) {
			yield* Effect.log("Scan is on cooldown");
			return yield* Effect.fail(
				new FleetCooldownError({
					cooldownExpiresAt: new Date(
						fleetAccount.data.scanCooldownExpiresAt.toNumber() * 1000,
					).toISOString(),
				}),
			);
		}

		const miscStats = fleetAccount.data.stats.miscStats as MiscStats;

		const scanCost = miscStats.scanCost;
		const sduPerScan = miscStats.sduPerScan;

		const isDataRunner = scanCost === 0;

		if (scanCost) {
			const foodAmount = yield* getFleetCargoPodInfoByType({
				type: "cargo_hold",
				fleetAccount,
			}).pipe(
				Effect.map((info) => info.resources),
				Effect.map(Record.get(resourceMintByName("Food").toString())),
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
				const foodCargoUnits = pipe(
					info.resources,
					Record.get(resourceMintByName("Food").toString()),
					Option.map((resource) => resource.amountInCargoUnits),
					Option.getOrElse(() => new BN(0)),
				);

				const diff = info.maxCapacityInCargoUnits
					.sub(info.totalResourcesAmountInCargoUnits)
					// NOTE: if the fleet is not a data runner, we need to add the
					// food cargo units to the total resources amount in cargo units as it's not counted
					.add(isDataRunner ? new BN(0) : foodCargoUnits);

				return diff.gte(new BN(sduPerScan));
			}),
		);

		if (!hasEnoughCargoSpace) {
			yield* Effect.log("Not enough cargo space for scan");
			return yield* new NotEnoughCargoSpaceForScanError();
		}

		const ixs: InstructionReturn[] = [];
		const preIxs = yield* createPreIxs({ fleetAccount, targetState: "Idle" });
		ixs.push(...preIxs);

		const startScanIxs = yield* createScanIx({
			fleetAccount,
		});

		ixs.push(...startScanIxs);

		const txs = yield* GameService.buildAndSignTransaction({
			ixs,
			size: 1, // NOTE: scan should be done in a single transaction
		});

		const signatures = yield* Effect.all(
			txs.map((tx) => GameService.sendTransaction(tx)),
		);

		yield* Effect.log("Scan started!");

		return { signatures };
	});
