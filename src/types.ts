import { Keypair, PublicKey } from "@solana/web3.js";

export type RequiredParam = {
  rpcUrl: string;
  keypair: Keypair;
  playerProfile: PublicKey;
};

export type CargoPodKind = "ammo_bank" | "fuel_tank" | "cargo_hold";
