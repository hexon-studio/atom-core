import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Context, Data, Effect, Layer } from "effect";

export class DatabaseService extends Context.Tag("app/DatabaseService")<
	DatabaseService,
	{
		client: Effect.Effect<SupabaseClient, CreateSupabaseClientError>;
	}
>() {}

export class CreateSupabaseClientError extends Data.TaggedError(
	"CreateSupabaseClientError",
)<{
	error: unknown;
}> {}

export const createDatabaseServiceLive = ({
	supabaseUrl,
	supabaseKey,
}: {
	supabaseUrl: string;
	supabaseKey: string;
}) =>
	Layer.succeed(
		DatabaseService,
		DatabaseService.of({
			client: Effect.try({
				try: () => createClient(supabaseUrl, supabaseKey),
				catch: (error) => new CreateSupabaseClientError({ error }),
			}),
		}),
	);
