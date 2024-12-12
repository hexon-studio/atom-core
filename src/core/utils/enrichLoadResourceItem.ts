import { PublicKey } from "@solana/web3.js";
import {
	SAGE_CARGO_STAT_VALUE_INDEX,
	getCargoSpaceUsedByTokenAmount,
} from "@staratlas/sage";
import BN from "bn.js";
import { Effect, Option, Record } from "effect";
import type { CargoPodKind, LoadResourceInput } from "../../decoders";
import { getAssociatedTokenAccountBalance } from "../../utils/getAssociatedTokenAccountBalance";
import { getAssociatedTokenAddress } from "../../utils/getAssociatedTokenAddress";
import type { CargoPodEnhanced } from "../cargo-utils";
import { computeDepositAmount } from "../fleet/instructions/createDepositCargoToFleetIx/computeDepositAmout";
import { getGameContext } from "../services/GameService/utils";
import { getCargoTypeAccount } from "./accounts";
import { getCargoTypeAddress } from "./pdas";

export const enrichLoadResourceInput = ({
	item,
	pods,
	totalResourcesAmountInCargoUnits,
	starbasePlayerCargoPodsPubkey,
}: {
	item: LoadResourceInput;
	totalResourcesAmountInCargoUnits: BN;
	pods: Record<CargoPodKind, CargoPodEnhanced>;
	starbasePlayerCargoPodsPubkey: PublicKey;
}) =>
	Effect.gen(function* () {
		const { amount, mode, cargoPodKind, resourceMint } = item;

		const context = yield* getGameContext();

		const cargoPodInfo = pods[cargoPodKind];

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

		const amountInCargoUnits = getCargoSpaceUsedByTokenAmount(
			cargoTypeAccount,
			new BN(amount),
		);

		const computedAmountInCargoUnits = yield* computeDepositAmount({
			cargoPodKind,
			resourceMint,
			starbaseAddress: PublicKey.default,
		})({
			mode,
			resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits,
			resourceAmountInFleet: resourceAmountInFleetInCargoUnits,
			resourceAmountInStarbase: getCargoSpaceUsedByTokenAmount(
				cargoTypeAccount,
				starbaseResourceAmountInTokens,
			),
			totalResourcesAmountInFleet: totalResourcesAmountInCargoUnits,
			value: amountInCargoUnits,
		});

		const resourceSpaceMultiplier =
			cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(1);

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
			starbaseResourceTokenAccount,
			amount,
			computedAmountInCargoUnits,
			cargoTypeAccount,
		};
	});

export type EnhancedResourceItem = Effect.Effect.Success<
	ReturnType<typeof enrichLoadResourceInput>
>;
