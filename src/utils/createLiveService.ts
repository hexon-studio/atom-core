import type { Keypair } from "@solana/web3.js";
import { Layer } from "effect";
import { createDatabaseServiceLive } from "../core/services/DatabaseService";
import { GameServiceLive } from "../core/services/GameService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import type { SupabaseOptions } from "../types";

export const createMainLiveService = ({
	keypair,
	rpcUrl,
	supabaseArgs,
}: {
	rpcUrl: string;
	keypair: Keypair;
	supabaseArgs?: SupabaseOptions;
}) => {
	const SolanaServiceLive = createSolanaServiceLive({ rpcUrl, keypair });

	const DatabaseServiceLive = supabaseArgs
		? createDatabaseServiceLive(supabaseArgs)
		: Layer.empty;

	return Layer.mergeAll(
		SolanaServiceLive,
		DatabaseServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
