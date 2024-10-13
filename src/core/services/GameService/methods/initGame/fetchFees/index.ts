import { PublicKey } from "@solana/web3.js";
import { Data, Effect } from "effect";
import { z } from "zod";

class FetchFeesError extends Data.TaggedError("FetchFeesError")<{
	error: unknown;
}> {}

class FeesDecodeError extends Data.TaggedError("FeesDecodeError")<{
	error: unknown;
}> {}

const mintFeeSchema = z.object({
	name: z.string(),
	mint: z.string().transform((value) => new PublicKey(value)),
	fee: z.number(),
});

const decoder = z.object({
	data: z.object({
		feeAddress: z.string().transform((value) => new PublicKey(value)),
		defaultFee: z.number(),
		mintFees: z.array(mintFeeSchema),
	}),
});

export type Fees = z.infer<typeof decoder>["data"];

export const fetchFees = (): Effect.Effect<
	Fees,
	FetchFeesError | FeesDecodeError
> => {
	const url = "https://n8n.staratlasitalia.com/webhook/getFees";

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
