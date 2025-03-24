import { Console, Effect } from "effect";
import { jsonStringify } from "~/utils/jsonStringify";
import { getGameContext } from "../core/services/GameService/utils";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

export const runProfileInfo = async (globalOpts: GlobalOptions) =>
	makeAtomCommand(() =>
		getGameContext().pipe(
			Effect.map((context) => jsonStringify(context.playerProfile)),
			Effect.tap(Console.log),
		),
	)(globalOpts);
