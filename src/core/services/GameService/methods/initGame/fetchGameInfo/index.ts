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
		gameId: publicKeyDecoder,
		gameStateId: publicKeyDecoder,
		cargoStatsDefinitionId: publicKeyDecoder,
		cargoStatsDefinitionSeqId: z.number(),
		craftingDomain: publicKeyDecoder,
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
	}),
});

export type GameInfo = z.infer<typeof decoder>["data"];

export const fetchGameInfo = (
	commonApiUrl: string,
): Effect.Effect<GameInfo, FetchGameInfoError | GameInfoDecodeError> => {
	return Effect.tryPromise({
		try: () => fetch(commonApiUrl).then((res) => res.json()),
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
