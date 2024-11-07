import type { SupabaseClient } from "@supabase/supabase-js";
import { Context, Data, Effect, Layer, Match } from "effect";
import type { Database } from "../../../libs/database.types";
import {
	type CreateSupabaseClient,
	createSupabaseClient,
} from "../../../libs/supabase";
import type { SupabaseOptions } from "../../../types";

export type UpdateTaskParams =
	| {
			newStatus: "running";
	  }
	| {
			newStatus: "success";
			signatures: string[];
	  }
	| {
			newStatus: "error";
			tag: string;
			message: string;
			signatures: string[];
	  };

const createUpdateTaskStatus =
	(client: SupabaseClient<Database>, taskId: string) =>
	(param: UpdateTaskParams) => {
		const { whereStatus, payload } = Match.value(param).pipe(
			Match.when({ newStatus: "running" }, ({ newStatus: status }) => ({
				whereStatus: "scheduled" as const,
				payload: {
					status,
					schedule_expire_at: null,
				},
			})),
			Match.when(
				{ newStatus: "success" },
				({ newStatus: status, signatures }) => ({
					whereStatus: "running" as const,
					payload: { status, transactions: signatures.join(",") },
				}),
			),
			Match.when(
				{ newStatus: "error" },
				({ newStatus: status, message, tag, signatures }) => ({
					whereStatus: "running" as const,
					payload: {
						status,
						transactions: signatures.join(","),
						error_tag: tag,
						error_message: message,
					},
				}),
			),
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
