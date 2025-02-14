import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Match, Record, pipe } from "effect";
import type { CargoPodEnhancedResource } from "~/libs/@staratlas/cargo";
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";
import type { CargoPodKind } from "~/utils/decoders";

export const getCargoPodsResourcesDifference = ({
	cargoPodKind,
	after,
	before,
}: {
	cargoPodKind: CargoPodKind;
	before: CargoPodEnhancedResource;
	after: CargoPodEnhancedResource;
}): CargoPodsDifference => {
	const beforeItems = Record.map(before, (a) => ({
		...a,
		type: "before" as const,
	}));

	const afterItems = Record.map(after, (a) => ({
		...a,
		type: "after" as const,
	}));

	return pipe(
		Record.union(beforeItems, afterItems, (before, after) => ({
			type: "difference" as const,
			mint: after.mint,
			cargoPodKind,
			resourceMultiplier: getCargoTypeResourceMultiplier(
				after.cargoTypeAccount,
			),
			diffAmountInCargoUnits: after.amountInCargoUnits.sub(
				before.amountInCargoUnits,
			),
			diffAmountInTokens: after.amountInTokens.sub(before.amountInTokens),
		})),
		Record.map((item) =>
			Match.value(item).pipe(
				Match.when({ type: "before" }, (before) => ({
					type: "difference" as const,
					mint: before.mint,
					cargoPodKind,
					resourceMultiplier: getCargoTypeResourceMultiplier(
						before.cargoTypeAccount,
					),
					diffAmountInCargoUnits: new BN(0).sub(before.amountInCargoUnits),
					diffAmountInTokens: new BN(0).sub(before.amountInTokens),
				})),
				Match.when({ type: "after" }, (after) => ({
					type: "difference" as const,
					mint: after.mint,
					cargoPodKind,
					resourceMultiplier: getCargoTypeResourceMultiplier(
						after.cargoTypeAccount,
					),
					diffAmountInCargoUnits: after.amountInCargoUnits,
					diffAmountInTokens: after.amountInTokens,
				})),
				Match.when({ type: "difference" }, (diff) => diff),
				Match.exhaustive,
			),
		),
		Record.remove("type"),
	);
};

export type CargoPodsDifference = Record<
	string,
	{
		mint: PublicKey;
		cargoPodKind: CargoPodKind;
		resourceMultiplier: BN;
		diffAmountInCargoUnits: BN;
		diffAmountInTokens: BN;
	}
>;
