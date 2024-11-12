import type { PublicKey } from "@solana/web3.js";
import { Console, Effect, Option } from "effect";
import { constNull } from "effect/Function";
import {
	DatabaseService,
	type UpdateTaskParams,
} from "../services/DatabaseService";

export const updateTaskIfDatabaseServiceAvailable = (param: UpdateTaskParams) =>
	Effect.serviceOption(DatabaseService).pipe(
		Effect.map(Option.getOrNull),
		Effect.flatMap((service) =>
			service ? service.updateTaskStatus(param) : Effect.succeed(null),
		),
		Effect.tapErrorTag("UpdateTaskStatusError", (error) =>
			Console.log("Error updating task", error),
		),
		Effect.orElseSucceed(constNull),
	);

export const updateCreditsIfDatabaseServiceAvailable = (pbk: PublicKey) =>
	Effect.serviceOption(DatabaseService).pipe(
		Effect.map(Option.getOrNull),
		Effect.flatMap((service) =>
			service ? service.removeUserCredit(pbk) : Effect.succeed(null),
		),
		Effect.tapErrorTag("UpdateCreditsFieldError", (error) =>
			Console.log("Error updating user", error),
		),
		Effect.orElseSucceed(constNull),
	);
