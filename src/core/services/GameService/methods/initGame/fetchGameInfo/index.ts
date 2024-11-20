import { PublicKey } from "@solana/web3.js";
import { Data, Effect } from "effect";
import { z } from "zod";

class FetchGameInfoError extends Data.TaggedError("FetchGameInfoError")<{
	error: unknown;
}> {}

class GameInfoDecodeError extends Data.TaggedError("DecodeGameInfoError")<{
	error: unknown;
}> {}

const publicKeyDecoder = z.string().transform((value) => new PublicKey(value));

const decoder = z.object({
	data: z.object({
		game: z.object({
			key: publicKeyDecoder,
			data: z.object({
				profile: publicKeyDecoder,
				gameState: publicKeyDecoder,
				points: z.object({
					lpCategory: z.object({
						category: publicKeyDecoder,
						modifier: publicKeyDecoder,
					}),
					councilRankXpCategory: z.object({
						category: publicKeyDecoder,
						modifier: publicKeyDecoder,
					}),
					pilotXpCategory: z.object({
						category: publicKeyDecoder,
						modifier: publicKeyDecoder,
					}),
					dataRunningXpCategory: z.object({
						category: publicKeyDecoder,
						modifier: publicKeyDecoder,
					}),
					miningXpCategory: z.object({
						category: publicKeyDecoder,
						modifier: publicKeyDecoder,
					}),
					craftingXpCategory: z.object({
						category: publicKeyDecoder,
						modifier: publicKeyDecoder,
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
	const url = "https://api.hexon.tools/webhook/v1/initGame";

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
