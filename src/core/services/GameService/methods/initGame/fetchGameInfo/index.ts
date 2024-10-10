import { PublicKey } from "@solana/web3.js";
import { Data, Effect } from "effect";
import { z } from "zod";

class FetchGameInfoError extends Data.TaggedError("FetchGameInfoError")<{
	error: unknown;
}> {}

class GameInfoDecodeError extends Data.TaggedError("DecodeGameInfoError")<{
	error: unknown;
}> {}

const decoder = z.object({
	data: z.object({
		game: z.object({
			key: z.string().transform((value) => new PublicKey(value)),
			data: z.object({
				profile: z.string().transform((value) => new PublicKey(value)),
				gameState: z.string().transform((value) => new PublicKey(value)),
				points: z.object({
					lpCategory: z.object({
						category: z.string().transform((value) => new PublicKey(value)),
						modifier: z.string().transform((value) => new PublicKey(value)),
					}),
					councilRankXpCategory: z.object({
						category: z.string().transform((value) => new PublicKey(value)),
						modifier: z.string().transform((value) => new PublicKey(value)),
					}),
					pilotXpCategory: z.object({
						category: z.string().transform((value) => new PublicKey(value)),
						modifier: z.string().transform((value) => new PublicKey(value)),
					}),
					dataRunningXpCategory: z.object({
						category: z.string().transform((value) => new PublicKey(value)),
						modifier: z.string().transform((value) => new PublicKey(value)),
					}),
					miningXpCategory: z.object({
						category: z.string().transform((value) => new PublicKey(value)),
						modifier: z.string().transform((value) => new PublicKey(value)),
					}),
					craftingXpCategory: z.object({
						category: z.string().transform((value) => new PublicKey(value)),
						modifier: z.string().transform((value) => new PublicKey(value)),
					}),
				}),
				cargo: z.object({
					statsDefinition: z
						.string()
						.transform((value) => new PublicKey(value)),
				}),
			}),
		}),
		cargoStatsDefinition: z.object({
			key: z.string().transform((value) => new PublicKey(value)),
			data: z.object({
				statsCount: z.number(),
				seqId: z.number(),
			}),
		}),
	}),
});

export type GameInfo = z.infer<typeof decoder>["data"];

export const fetchGameInfo = (): Effect.Effect<
	GameInfo,
	FetchGameInfoError | GameInfoDecodeError
> => {
	const url = "https://n8n.staratlasitalia.com/webhook/v1/initGame";

	return Effect.tryPromise({
		try: () => fetch(url).then((res) => res.json()),
		catch: (error) => new FetchGameInfoError({ error }),
	}).pipe(
		Effect.map(decoder.safeParse),
		Effect.flatMap((decodedData) =>
			decodedData.success
				? Effect.succeed(decodedData.data)
				: Effect.fail(new GameInfoDecodeError({ error: decodedData.error })),
		),
		Effect.map(({ data }) => data),
	);
};
