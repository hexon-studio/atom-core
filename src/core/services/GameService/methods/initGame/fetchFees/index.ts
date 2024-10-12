import { PublicKey } from "@solana/web3.js";
import { Data, Effect } from "effect";
import { z } from "zod";

class FetchFeesError extends Data.TaggedError("FetchFeesError")<{
	error: unknown;
}> {}

class FeesDecodeError extends Data.TaggedError("FeesDecodeError")<{
	error: unknown;
}> {}

const resourceSchema = z.object({
	mint: z.string().transform((value) => new PublicKey(value)),
	fee: z.number(),
});

const decoder = z.object({
	feeAddress: z.string().transform((value) => new PublicKey(value)),
	default_fee: z.number(),
	hydrogen: resourceSchema,
	carbon: resourceSchema,
	copperOre: resourceSchema,
	ironOre: resourceSchema,
	silica: resourceSchema,
	nitrogen: resourceSchema,
	lumanite: resourceSchema,
	biomass: resourceSchema,
	titaniumOre: resourceSchema,
	arco: resourceSchema,
	diamond: resourceSchema,
	rochinol: resourceSchema,
});

export type Fees = z.infer<typeof decoder>;

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
	);
};
