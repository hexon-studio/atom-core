import { Layer } from "effect";
import { createDatabaseServiceLive } from "../core/services/DatabaseService";
import { GameServiceLive } from "../core/services/GameService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import type { GlobalOptionsWithSupabase } from "../types";

export const createMainLiveService = (opts: GlobalOptionsWithSupabase) => {
	const SolanaServiceLive = createSolanaServiceLive(opts);

	const DatabaseServiceLive = opts.supabaseArgs
		? createDatabaseServiceLive(opts.supabaseArgs)
		: Layer.empty;

	return Layer.mergeAll(
		SolanaServiceLive,
		DatabaseServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
