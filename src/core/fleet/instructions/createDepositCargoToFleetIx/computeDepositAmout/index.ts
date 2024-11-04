import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect, Match } from "effect";
import type { CargoPodKind, LoadResourceInput } from "../../../../../decoders";
import {
	FleetNotEnoughSpaceError,
	ResourceNotEnoughError,
} from "../../../errors";

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
	(param: {
		mode: LoadResourceInput["mode"];
		value: BN;
		resourceAmountInStarbase: BN;
		resourceAmountInFleet: BN;
		resourceFleetMaxCap: BN;
	}) => {
		const freeAmountInFleet = param.resourceFleetMaxCap.sub(
			param.resourceAmountInFleet,
		);

		return Match.value({ ...param, freeAmountInFleet }).pipe(
			Match.when(
				{ mode: "fixed" },
				({ value: fixedAmount, resourceAmountInStarbase, freeAmountInFleet }) =>
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

						if (freeAmountInFleet.lt(new BN(fixedAmount))) {
							return yield* Effect.fail(
								new FleetNotEnoughSpaceError({
									amountAdded: fixedAmount.toString(),
									amountAvailable: freeAmountInFleet.toString(),
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
					freeAmountInFleet,
				}) =>
					Effect.sync(() => {
						const neededQtyInTokens = capThreshold.sub(resourceAmountInFleet);

						if (neededQtyInTokens.lten(0)) {
							return new BN(0);
						}

						return BN.min(neededQtyInTokens, resourceAmountInStarbase);
					}),
			),
			Match.when(
				{ mode: "min" },
				({
					value: floorThreshold,
					resourceAmountInFleet,
					resourceAmountInStarbase,
				}) =>
					Effect.gen(function* () {
						const neededQtyInTokens = floorThreshold.sub(resourceAmountInFleet);

						if (neededQtyInTokens.lten(0)) {
							return new BN(0);
						}

						if (neededQtyInTokens.gt(resourceAmountInStarbase)) {
							return yield* Effect.fail(
								new ResourceNotEnoughError({
									from: "starbase",
									entity: starbaseAddress,
									resourceMint,
									amountAvailable: resourceAmountInStarbase.toString(),
									amountAdded: neededQtyInTokens.toString(),
								}),
							);
						}

						return neededQtyInTokens;
					}),
			),
			Match.when(
				{ mode: "min-and-fill" },
				({
					value: minFillThreshold,
					resourceAmountInFleet,
					freeAmountInFleet,
					resourceAmountInStarbase,
				}) =>
					Effect.gen(function* () {
						if (resourceAmountInFleet.gte(minFillThreshold)) {
							return new BN(0);
						}

						const neededQtyInTokens = BN.max(
							minFillThreshold.sub(resourceAmountInFleet),
							new BN(0),
						);

						if (neededQtyInTokens.gt(resourceAmountInStarbase)) {
							return yield* Effect.fail(
								new ResourceNotEnoughError({
									from: "starbase",
									entity: starbaseAddress,
									resourceMint,
									amountAvailable: resourceAmountInStarbase.toString(),
									amountAdded: neededQtyInTokens.toString(),
								}),
							);
						}

						return BN.min(freeAmountInFleet, resourceAmountInStarbase);
					}),
			),
			Match.exhaustive,
		);
	};
