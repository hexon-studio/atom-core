import type { Keypair, PublicKey } from "@solana/web3.js";

export type SupabaseOptions = {
	supabaseKey: string;
	supabaseUrl: string;
	accessToken: string;
	taskId: string;
};

export type GlobalOptionsWithSupabase = Omit<
	GlobalOptions,
	"supabaseKey" | "supabaseUrl" | "accessToken" | "taskId"
> & {
	supabaseArgs?: SupabaseOptions;
};

export type GlobalOptions = {
	keypair: Keypair;
	owner: PublicKey;
	playerProfile: PublicKey;
	rpcUrl: string;
	supabaseKey?: string;
	supabaseUrl?: string;
	accessToken?: string;
	taskId?: string;
	verbose: boolean;
};
