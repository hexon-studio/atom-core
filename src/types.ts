import type { Keypair, PublicKey } from "@solana/web3.js";

export type RequiredParam = {
	rpcUrl: string;
	keypair: Keypair;
	owner: PublicKey;
	playerProfile: PublicKey;
};

export type CargoPodKind = "ammo_bank" | "fuel_tank" | "cargo_hold";
