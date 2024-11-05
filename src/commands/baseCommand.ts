import { Effect } from "effect";
import { updateTaskIfDatabaseServiceAvailable } from "../core/utils/updateTaskIfDatabaseServiceAvailable";

export const runBaseCommand = <E, R>({
	self,
	mapError,
}: {
	self: Effect.Effect<string[], E, R>;
	mapError: (error: E) => { tag: string; message: string };
}) =>
	updateTaskIfDatabaseServiceAvailable({ newStatus: "running" }).pipe(
		Effect.flatMap(() => self),
		Effect.tap((txIds) =>
			updateTaskIfDatabaseServiceAvailable({ newStatus: "success", txIds }),
		),
		Effect.tapError((error) =>
			updateTaskIfDatabaseServiceAvailable({
				newStatus: "error",
				errorTag: mapError(error).tag,
				errorMessage: mapError(error).message,
			}),
		),
	);
