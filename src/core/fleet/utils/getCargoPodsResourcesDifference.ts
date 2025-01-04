import { Array as EffectArray, Order, Record, pipe } from "effect";
import type { CargoPodKind } from "~/decoders";
import type { CargoPodEnhancedResource } from "~/libs/@staratlas/cargo";
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";

export const getCargoPodsResourcesDifference = ({
	cargoPodKind,
	after,
	before,
}: {
	cargoPodKind: CargoPodKind;
	before: CargoPodEnhancedResource;
	after: CargoPodEnhancedResource;
}) =>
	pipe(
		EffectArray.zip(
			EffectArray.sortWith(
				Record.values(after),
				(res) => res.mint.toString(),
				Order.string,
			),
			EffectArray.sortWith(
				Record.values(before),
				(res) => res.mint.toString(),
				Order.string,
			),
		),
		EffectArray.map(([afterRes, beforeRes]) => ({
			mint: afterRes.mint,
			cargoPodKind,
			resourceMultiplier: getCargoTypeResourceMultiplier(
				afterRes.cargoTypeAccount,
			),
			diffAmountInCargoUnits: afterRes.amountInCargoUnits.sub(
				beforeRes.amountInCargoUnits,
			),
			diffAmountInTokens: afterRes.amountInTokens.sub(beforeRes.amountInTokens),
		})),
	);

export type CargoPodsDifference = ReturnType<
	typeof getCargoPodsResourcesDifference
>;
