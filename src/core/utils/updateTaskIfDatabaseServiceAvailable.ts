import type { PublicKey } from "@solana/web3.js";
import { Console, Effect, identity } from "effect";
import { constNull } from "effect/Function";
import {
	DatabaseService,
	type UpdateTaskParams,
} from "../services/DatabaseService";

export const updateTaskIfDatabaseServiceAvailable = (param: UpdateTaskParams) =>
	Effect.serviceOption(DatabaseService).pipe(
		Effect.flatMap(identity),
		Effect.flatMap((service) => service.updateTaskStatus(param)),
		Effect.tapErrorTag("UpdateTaskStatusError", (error) =>
			Console.log("Error updating task", error),
		),
		Effect.orElseSucceed(constNull),
	);

export const updateCreditsIfDatabaseServiceAvailable = (pbk: PublicKey) =>
	Effect.serviceOption(DatabaseService).pipe(
		Effect.flatMap(identity),
		Effect.flatMap((service) => service.removeUserCredit(pbk)),
		Effect.tapErrorTag("UpdateCreditsFieldError", (error) =>
			Console.log("Error updating user", error),
		),
		Effect.tapErrorTag("NoSuchElementException", (error) =>
			Console.log("Error updating user", error),
		),
		Effect.orElseSucceed(constNull),
	);
