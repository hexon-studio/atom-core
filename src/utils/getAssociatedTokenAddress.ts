import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Data, Effect } from "effect";

export class GetAssociatedTokenAddressError extends Data.TaggedError(
	"GetAssociatedTokenAddressError",
)<{
	readonly error: unknown;
}> {}

export const findAssociatedTokenPda = (
	mint: PublicKey,
	owner: PublicKey,
	allowOwnerOffCurve = false,
) =>
	Effect.try({
		try: () => getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve),
		catch: (error) => new GetAssociatedTokenAddressError({ error }),
	});
