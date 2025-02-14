import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect, Match } from "effect";
import {
	FleetNotEnoughSpaceError,
	ResourceNotEnoughError,
} from "../../../../../errors";
import type {
	CargoPodKind,
	LoadResourceInput,
} from "../../../../../utils/decoders";

type Param = {
	mode: LoadResourceInput["mode"];
	value: BN;
	resourceAmountInStarbase: BN;
	resourceAmountInFleet: BN;
	resourceFleetMaxCap: BN;
	totalResourcesAmountInFleet: BN;
};

export const computeDepositAmount =
	({
		resourceMint,
		cargoPodKind,
		starbaseAddress,
	}: {
		resourceMint: PublicKey;
		starbaseAddress: PublicKey;
		cargoPodKind: CargoPodKind;
	}) =>
	(param: Param) => {
		const freeCargoUnitsInFleet = param.resourceFleetMaxCap.sub(
			param.totalResourcesAmountInFleet,
		);

		return Match.value({
			...param,
			freeCargoUnitsInFleet,
		}).pipe(
			Match.when(
				{ mode: "fixed" },
				({
					value: fixedAmount,
					resourceAmountInStarbase,
					freeCargoUnitsInFleet,
					mode,
				}) =>
					Effect.gen(function* () {
						if (resourceAmountInStarbase.lt(new BN(fixedAmount))) {
							yield* Effect.fail(
								new ResourceNotEnoughError({
									from: "starbase",
									entity: starbaseAddress,
									amountAdded: fixedAmount.toString(),
									amountAvailable: resourceAmountInStarbase.toString(),
									resourceMint,
								}),
							);
						}

						if (freeCargoUnitsInFleet.lt(new BN(fixedAmount))) {
							return yield* Effect.fail(
								new FleetNotEnoughSpaceError({
									amountAdded: fixedAmount.toString(),
									amountAvailable: freeCargoUnitsInFleet.toString(),
									cargoKind: cargoPodKind,
								}),
							);
						}

						return fixedAmount;
					}),
			),
			Match.when(
				{ mode: "max" },
				({
					value: capThreshold,
					resourceAmountInFleet,
					resourceAmountInStarbase,
					freeCargoUnitsInFleet,
				}) =>
					Effect.sync(() => {
						const neededQtyInCargoUnits = capThreshold.sub(
							resourceAmountInFleet,
						);

						if (neededQtyInCargoUnits.lten(0)) {
							return new BN(0);
						}

						return BN.min(
							freeCargoUnitsInFleet,
							BN.min(neededQtyInCargoUnits, resourceAmountInStarbase),
						);
					}),
			),
			Match.when(
				{ mode: "min" },
				({
					mode,
					value: floorThreshold,
					resourceAmountInFleet,
					resourceAmountInStarbase,
					freeCargoUnitsInFleet,
				}) =>
					Effect.gen(function* () {
						const neededQtyInCargoUnits = floorThreshold.sub(
							resourceAmountInFleet,
						);

						if (neededQtyInCargoUnits.lten(0)) {
							return new BN(0);
						}

						if (neededQtyInCargoUnits.gt(resourceAmountInStarbase)) {
							return yield* Effect.fail(
								new ResourceNotEnoughError({
									from: "starbase",
									entity: starbaseAddress,
									resourceMint,
									amountAvailable: resourceAmountInStarbase.toString(),
									amountAdded: neededQtyInCargoUnits.toString(),
								}),
							);
						}

						if (neededQtyInCargoUnits.gt(freeCargoUnitsInFleet)) {
							return yield* Effect.fail(
								new FleetNotEnoughSpaceError({
									amountAdded: neededQtyInCargoUnits.toString(),
									amountAvailable: freeCargoUnitsInFleet.toString(),
									cargoKind: cargoPodKind,
								}),
							);
						}

						return neededQtyInCargoUnits;
					}),
			),
			Match.when(
				{ mode: "min-and-fill" },
				({
					value: minFillThreshold,
					resourceAmountInFleet,
					freeCargoUnitsInFleet,
					resourceAmountInStarbase,
				}) =>
					Effect.gen(function* () {
						if (resourceAmountInFleet.gte(minFillThreshold)) {
							return new BN(0);
						}

						const neededQtyInCargoUnits = BN.max(
							minFillThreshold.sub(resourceAmountInFleet),
							new BN(0),
						);

						if (neededQtyInCargoUnits.gt(resourceAmountInStarbase)) {
							return yield* Effect.fail(
								new ResourceNotEnoughError({
									from: "starbase",
									entity: starbaseAddress,
									resourceMint,
									amountAvailable: resourceAmountInStarbase.toString(),
									amountAdded: neededQtyInCargoUnits.toString(),
								}),
							);
						}

						return BN.min(freeCargoUnitsInFleet, resourceAmountInStarbase);
					}),
			),
			Match.exhaustive,
		);
	};
