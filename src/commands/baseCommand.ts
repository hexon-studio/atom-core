import { Effect } from "effect";
import { updateTaskIfDatabaseServiceAvailable } from "../core/utils/updateTaskIfDatabaseServiceAvailable";

export const runBaseCommand = <E, R>({
	self,
	mapError,
}: {
	self: () => Effect.Effect<string[], E, R>;
	mapError: (error: E) => {
		tag: string;
		message: string;
		signature?: string;
	};
}) =>
	updateTaskIfDatabaseServiceAvailable({ newStatus: "running" }).pipe(
		Effect.flatMap(self),
		Effect.tapBoth({
			onFailure: (error) => {
				const { message, tag, signature } = mapError(error);

				return updateTaskIfDatabaseServiceAvailable({
					newStatus: "error",
					errorTag: tag,
					errorMessage: message,
					txIds: signature ? [signature] : undefined,
				});
			},
			onSuccess: (txIds) =>
				updateTaskIfDatabaseServiceAvailable({ newStatus: "success", txIds }),
		}),
	);
