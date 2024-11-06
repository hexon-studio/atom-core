import type { SupabaseClient } from "@supabase/supabase-js";
import { Context, Data, Effect, Layer, Match } from "effect";
import type { Database } from "../../../libs/database.types";
import {
	type CreateSupabaseClient,
	createSupabaseClient,
} from "../../../libs/supabase";
import type { SupabaseOptions } from "../../../types";

const createUpdateTaskStatus =
	(client: SupabaseClient<Database>, taskId: string) =>
	({
		errorTag,
		errorMessage,
		newStatus,
		transactions,
	}: {
		newStatus: "running" | "success" | "error";
		transactions: string | null;
		errorTag?: string;
		errorMessage?: string;
	}) => {
		const { whereStatus, payload } = Match.value(newStatus).pipe(
			Match.when("running", (status) => ({
				whereStatus: "scheduled" as const,
				payload: {
					status,
					schedule_expire_at: null,
				},
			})),
			Match.when("success", (status) => ({
				whereStatus: "running" as const,
				payload: { status, transactions },
			})),
			Match.when("error", (status) => ({
				whereStatus: "running" as const,
				payload: {
					status,
					transactions,
					error_tag: errorTag,
					error_message: errorMessage,
				},
			})),
			Match.exhaustive,
		);

		return Effect.tryPromise({
			try: () =>
				client
					.from("tasks")
					.update(payload)
					.eq("status", whereStatus)
					.eq("id", taskId),
			catch: (error) => new UpdateTaskStatusError({ error }),
		});
	};

export class DatabaseService extends Context.Tag("app/DatabaseService")<
	DatabaseService,
	{
		client: CreateSupabaseClient;
		updateTaskStatus: ReturnType<typeof createUpdateTaskStatus>;
	}
>() {}

export class UpdateTaskStatusError extends Data.TaggedError(
	"UpdateTaskStatusError",
)<{ error: unknown }> {}

export const createDatabaseServiceLive = ({
	supabaseUrl,
	supabaseKey,
	taskId,
}: SupabaseOptions) => {
	const client = createSupabaseClient({ supabaseKey, supabaseUrl });

	return Layer.succeed(
		DatabaseService,
		DatabaseService.of({
			client,
			updateTaskStatus: createUpdateTaskStatus(client, taskId),
		}),
	);
};
