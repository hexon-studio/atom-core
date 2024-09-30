import { AtlasPrimeTransactionBuilder } from "@staratlas/atlas-prime";
import { Data, Effect } from "effect";

export class FetchDummyKeysError extends Data.TaggedError(
	"FetchDummyKeysError",
)<{
	error: unknown;
}> {}

export const fetchDummyKeys = () =>
	Effect.tryPromise({
		try: () =>
			AtlasPrimeTransactionBuilder.fetchDummyKeys(
				"https://prime.staratlas.com/",
			),
		catch: (error) => new FetchDummyKeysError({ error }),
	});
