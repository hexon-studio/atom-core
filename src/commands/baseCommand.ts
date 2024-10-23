import { Effect } from "effect";
import { updateTaskIfDatabaseServiceAvailable } from "../core/utils/updateTaskIfDatabaseServiceAvailable";

export const runBaseCommand = <A, E, R>({
	self,
	mapError,
}: {
	self: Effect.Effect<A, E, R>;
	mapError: (error: E) => { tag: string; message: string };
}) =>
	updateTaskIfDatabaseServiceAvailable({ newStatus: "running" }).pipe(
		Effect.flatMap(() => self),
		Effect.tap(() =>
			updateTaskIfDatabaseServiceAvailable({ newStatus: "success" }),
		),
		Effect.tapError((error) =>
			updateTaskIfDatabaseServiceAvailable({
				newStatus: "error",
				errorTag: mapError(error).tag,
				errorMessage: mapError(error).message,
			}),
		),
	);
