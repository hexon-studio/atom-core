import { Array as EffectArray, Order, Record, pipe } from "effect";
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";
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
			cargoPodKind: after.type,
			resourceMultiplier: getCargoTypeResourceMultiplier(
				afterRes.cargoTypeAccount,
			),
			amountInCargoUnits: afterRes.amountInCargoUnits.sub(
				beforeRes.amountInCargoUnits,
			),
			amountInTokens: afterRes.amountInTokens.sub(beforeRes.amountInTokens),
		})),
	);

export type CargoPodsDifference = ReturnType<
	typeof getCargoPodsResourcesDifference
>;
