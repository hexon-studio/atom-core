import { Console, Effect, Option } from "effect";
import { DatabaseService } from "../services/DatabaseService";

export const updateTaskIfDatabaseServiceAvailable = ({
	newStatus,
	errorTag,
	errorMessage,
}: {
	newStatus: "running" | "success" | "error";
	errorTag?: string;
	errorMessage?: string;
}) =>
	Effect.serviceOption(DatabaseService).pipe(
		Effect.map(Option.getOrNull),
		Effect.flatMap((service) =>
			service
				? service.updateTaskStatus({
						newStatus,
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
