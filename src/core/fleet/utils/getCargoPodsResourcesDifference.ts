import { SAGE_CARGO_STAT_VALUE_INDEX } from "@staratlas/sage";
import { BN } from "bn.js";
import { Array as EffectArray, Order, Record, pipe } from "effect";
import type { CargoPodEnhanced } from "../../cargo-utils";

export const getCargoPodsResourcesDifference = ({
	after,
	before,
}: {
	before: CargoPodEnhanced;
	after: CargoPodEnhanced;
}) =>
	pipe(
		EffectArray.zip(
			EffectArray.sortWith(
				Record.values(after.resources),
				(res) => res.mint.toString(),
				Order.string,
			),
			EffectArray.sortWith(
				Record.values(before.resources),
				(res) => res.mint.toString(),
				Order.string,
			),
		),
		EffectArray.map(([afterRes, beforeRes]) => ({
			mint: afterRes.mint,
			resourceMultiplier:
				afterRes.cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ??
				new BN(1),
			amountInCargoUnits: beforeRes.amountInCargoUnits.sub(
				afterRes.amountInCargoUnits,
			),
			amountInTokens: beforeRes.amountInTokens.sub(afterRes.amountInTokens),
		})),
	);

export type CargoPodsDifference = ReturnType<
	typeof getCargoPodsResourcesDifference
>;
