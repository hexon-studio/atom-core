import type { PublicKey } from "@solana/web3.js";
import { Boolean as EffectBoolean, Option } from "effect";
import type { GlobalOptions } from "./globalOptions";

export const parseOptionsFees = ({
	atlasPrime,
	feeLamports,
	feeRecipient,
	feeAtlas,
}: GlobalOptions) => {
	const fees: Option.Option<
		| {
				type: "sol";
				lamports: number;
				recipient: PublicKey;
		  }
		| {
				type: "atlas-prime";
				atlas: number;
				recipient: PublicKey;
		  }
	> = EffectBoolean.match(atlasPrime, {
		onFalse: () =>
			Option.all([feeLamports, feeRecipient]).pipe(
				Option.map(([feeLamports, feeRecipient]) => ({
					type: "sol" as const,
					lamports: feeLamports,
					recipient: feeRecipient,
				})),
			),
		onTrue: () =>
			Option.all([feeAtlas, feeRecipient]).pipe(
				Option.map(([feeAtlas, feeRecipient]) => ({
					type: "atlas-prime" as const,
					atlas: feeAtlas,
					recipient: feeRecipient,
				})),
			),
	});

	return fees;
};
