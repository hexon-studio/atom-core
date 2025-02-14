import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Effect } from "effect";
import { FindAssociatedTokenPdaError } from "~/errors";

export const findAssociatedTokenPda = ({
	mint,
	owner,
	allowOwnerOffCurve = true,
}: {
	mint: PublicKey;
	owner: PublicKey;
	allowOwnerOffCurve?: boolean;
}) =>
	Effect.try({
		try: () => getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve),
		catch: (error) => new FindAssociatedTokenPdaError({ error }),
	});
