import type { Keypair } from "@solana/web3.js";
import { Layer } from "effect";
import { GameServiceLive } from "../core/services/GameService";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import { createDatabaseServiceLive } from "../core/services/DatabaseService";

export const createMainLiveService = ({
	keypair,
	rpcUrl,
	supabaseUrl,
	supabaseKey,
}: {
	rpcUrl: string;
	keypair: Keypair;
	supabaseUrl: string;
	supabaseKey: string;
}) => {
	const SolanaServiceLive = createSolanaServiceLive({ rpcUrl, keypair });

	const DatabaseServiceLive = createDatabaseServiceLive({
		supabaseUrl,
		supabaseKey,
	});

	return Layer.mergeAll(
		SolanaServiceLive,
		DatabaseServiceLive,
		GameServiceLive.pipe(Layer.provide(SolanaServiceLive)),
	);
};
