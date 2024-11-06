import { Console, Effect, Option } from "effect";
import { DatabaseService } from "../services/DatabaseService";

export const updateTaskIfDatabaseServiceAvailable = ({
	errorTag,
	errorMessage,
	newStatus,
	txIds,
}: {
	errorTag?: string;
	errorMessage?: string;
	newStatus: "running" | "success" | "error";
	txIds?: string[];
}) =>
	Effect.serviceOption(DatabaseService).pipe(
		Effect.map(Option.getOrNull),
		Effect.flatMap((service) =>
			service
				? service.updateTaskStatus({
						newStatus,
						transactions: txIds?.join(",") ?? null,
						errorTag: newStatus === "error" ? errorTag : undefined,
						errorMessage: newStatus === "error" ? errorMessage : undefined,
					})
				: Effect.succeed(null),
		),
		Effect.tapError((error) =>
			Console.log("Error updating task status", error),
		),
		Effect.orElseSucceed(() => null),
	);
