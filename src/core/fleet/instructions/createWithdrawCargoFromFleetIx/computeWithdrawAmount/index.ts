import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect, Match } from "effect";
import { ResourceNotEnoughError } from "../../../../../errors";
import type { UnloadResourceInput } from "../../../../../utils/decoders";

export const computeWithdrawAmount =
	({
		resourceMint,
		fleetAddress,
	}: {
		resourceMint: PublicKey;
		fleetAddress: PublicKey;
	}) =>
	(param: {
		mode: UnloadResourceInput["mode"];
		value: BN;
		resourceAmountInFleet: BN;
		resourceFleetMaxCap: BN;
	}) => {
		return Match.value(param).pipe(
			Match.when(
				{ mode: "fixed" },
				({ value: fixedAmount, resourceAmountInFleet }) =>
					Effect.gen(function* () {
						if (resourceAmountInFleet.lt(new BN(fixedAmount))) {
							yield* Effect.fail(
								new ResourceNotEnoughError({
									from: "fleet",
									entity: fleetAddress,
									resourceMint,
									amountAdded: fixedAmount.toString(),
									amountAvailable: resourceAmountInFleet.toString(),
								}),
							);
						}

						return fixedAmount;
					}),
			),
			Match.when(
				{ mode: "max" },
				({ value: capThreshold, resourceAmountInFleet }) =>
					Effect.sync(() => {
						const neededQtyInTokens = BN.min(
							capThreshold,
							resourceAmountInFleet,
						);

						return neededQtyInTokens;
					}),
			),

			Match.exhaustive,
		);
	};
