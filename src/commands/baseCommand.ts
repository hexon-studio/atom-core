import { Effect, Option } from "effect";
import { getGameContext } from "../core/services/GameService/utils";
import {
	updateCreditsIfDatabaseServiceAvailable,
	updateTaskIfDatabaseServiceAvailable,
} from "../core/utils/updateTaskIfDatabaseServiceAvailable";

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
				getGameContext().pipe(
					Effect.flatMap((context) =>
						Option.fromNullable(context.fees.feeAddress).pipe(
							Effect.tapErrorTag("NoSuchElementException", () =>
								updateCreditsIfDatabaseServiceAvailable(context.owner),
							),
							Effect.tap(() =>
								updateTaskIfDatabaseServiceAvailable({
									newStatus: "success",
									signatures,
								}),
							),
						),
					),
				),
		}),
	);
