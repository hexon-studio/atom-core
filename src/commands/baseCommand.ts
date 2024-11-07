import { Effect } from "effect";
import { updateTaskIfDatabaseServiceAvailable } from "../core/utils/updateTaskIfDatabaseServiceAvailable";

export const runBaseCommand = <E, R>({
	self,
	normalizeError,
}: {
	self: () => Effect.Effect<string[], E, R>;
	normalizeError: (error: E) => {
		tag: string;
		message: string;
		signature?: string;
	};
}) =>
	updateTaskIfDatabaseServiceAvailable({ newStatus: "running" }).pipe(
		Effect.flatMap(self),
		Effect.tapBoth({
			onFailure: (error) => {
				const { message, tag, signature } = normalizeError(error);

				return updateTaskIfDatabaseServiceAvailable({
					newStatus: "error",
					tag,
					message,
					signatures: signature ? [signature] : [],
				});
			},
			onSuccess: (signatures) =>
				updateTaskIfDatabaseServiceAvailable({
					newStatus: "success",
					signatures,
				}),
		}),
	);
