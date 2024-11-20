import { PublicKey } from "@solana/web3.js";
import { Data, Effect } from "effect";
import { z } from "zod";

export class FetchFeesError extends Data.TaggedError("FetchFeesError")<{
	error: unknown;
}> {}

export class FeesDecodeError extends Data.TaggedError("FeesDecodeError")<{
	error: unknown;
}> {}

const mintFeeSchema = z.object({
	name: z.string(),
	mint: z.string().transform((value) => new PublicKey(value)),
	fee: z.number(),
});

const decoder = z.object({
	data: z.object({
		feeAddress: z
			.string()
			.transform((value) => new PublicKey(value))
			.nullable(),
		defaultFee: z.number(),
		mintFees: z.array(mintFeeSchema),
	}),
});

export type Fees = z.infer<typeof decoder>["data"];

export const fetchFees = (
	owner: PublicKey,
): Effect.Effect<Fees, FetchFeesError | FeesDecodeError> => {
	const url = new URL("https://api.hexon.tools/webhook/v1/getFees");

	url.searchParams.set("pbk", owner.toString());

	return Effect.tryPromise({
		try: () => fetch(url).then((res) => res.json()),
		catch: (error) => new FetchFeesError({ error }),
	}).pipe(
		Effect.map(decoder.safeParse),
		Effect.flatMap((decodedData) =>
			decodedData.success
				? Effect.succeed(decodedData.data)
				: Effect.fail(new FeesDecodeError({ error: decodedData.error })),
		),
		Effect.map(({ data }) => data),
	);
};
