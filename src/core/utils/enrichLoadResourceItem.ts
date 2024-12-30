import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect, Option, Record } from "effect";
import type { CargoPodEnhanced } from "~/core/cargo-utils";
import { computeDepositAmount } from "~/core/fleet/instructions/createDepositCargoToFleetIx/computeDepositAmout";
import { getGameContext } from "~/core/services/GameService/utils";
import type { LoadResourceInput } from "~/decoders";
import {
	getCargoTypeAccount,
	getCargoTypeAddress,
} from "~/libs/@staratlas/cargo";
import {
	getCargoTypeResourceMultiplier,
	getCargoUnitsFromTokenAmount,
} from "~/libs/@staratlas/sage";
import { getAssociatedTokenAccountBalance } from "~/utils/getAssociatedTokenAccountBalance";
import { getAssociatedTokenAddress } from "~/utils/getAssociatedTokenAddress";

export const enrichLoadResourceInput = ({
	item,
	cargoPodInfo,
	totalResourcesAmountInCargoUnits,
	starbasePlayerCargoPodsPubkey,
}: {
	item: LoadResourceInput;
	totalResourcesAmountInCargoUnits: BN;
	cargoPodInfo: CargoPodEnhanced;
	starbasePlayerCargoPodsPubkey: PublicKey;
}) =>
	Effect.gen(function* () {
		const { amount, mode, cargoPodKind, resourceMint } = item;

		const context = yield* getGameContext();

		const starbaseResourceTokenAccount = yield* getAssociatedTokenAddress(
			resourceMint,
			starbasePlayerCargoPodsPubkey,
			true,
		);

		const starbaseResourceAmountInTokens =
			yield* getAssociatedTokenAccountBalance(starbaseResourceTokenAccount);

		const resourceAmountInFleetInCargoUnits = Record.get(
			cargoPodInfo.resources,
			resourceMint.toString(),
		).pipe(
			Option.map((resource) => resource.amountInCargoUnits),
			Option.getOrElse(() => new BN(0)),
		);

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const cargoTypeAccount = yield* getCargoTypeAccount(cargoTypeAddress);

		const amountInCargoUnits = getCargoUnitsFromTokenAmount({
			amount: new BN(amount),
			cargoType: cargoTypeAccount,
		});

		const computedAmountInCargoUnits = yield* computeDepositAmount({
			cargoPodKind,
			resourceMint,
			starbaseAddress: PublicKey.default,
		})({
			mode,
			resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits,
			resourceAmountInFleet: resourceAmountInFleetInCargoUnits,
			resourceAmountInStarbase: getCargoUnitsFromTokenAmount({
				amount: starbaseResourceAmountInTokens,
				cargoType: cargoTypeAccount,
			}),
			totalResourcesAmountInFleet: totalResourcesAmountInCargoUnits,
			value: amountInCargoUnits,
		});

		const resourceSpaceMultiplier =
			getCargoTypeResourceMultiplier(cargoTypeAccount);

		yield* Effect.log(
			`Load ${resourceMint.toString()} in ${cargoPodKind}`,
		).pipe(
			Effect.annotateLogs({
				resourceSpaceMultiplier: resourceSpaceMultiplier.toString(),
				resourceMint: resourceMint.toString(),
				cargoPodKind,
				resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits.toString(),
				mode,
				totalResourcesAmountInFleet:
					cargoPodInfo.totalResourcesAmountInCargoUnits.toString(),
				resourceAmountInFleet: resourceAmountInFleetInCargoUnits.toString(),
				resourceAmountInStarbase: starbaseResourceAmountInTokens.toString(),
				amount: amount.toString(),
				amountInCargoUnits: amountInCargoUnits.toString(),
				computedAmountInCargoUnits: computedAmountInCargoUnits.toString(),
				computedAmountInTokens: computedAmountInCargoUnits
					.div(resourceSpaceMultiplier)
					.toString(),
			}),
		);

		return {
			...item,
			cargoPodInfo,
			starbaseResourceTokenAccount,
			amount,
			computedAmountInCargoUnits,
			cargoTypeAccount,
		};
	});

export type EnhancedResourceItem = Effect.Effect.Success<
	ReturnType<typeof enrichLoadResourceInput>
>;
