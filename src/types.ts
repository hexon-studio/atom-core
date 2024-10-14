import type { Keypair, PublicKey } from "@solana/web3.js";
import { z } from "zod";

export type GlobalOptions = {
	keypair: Keypair;
	owner: PublicKey;
	playerProfile: PublicKey;
	rpcUrl: string;
	verbose: boolean;
};

export const cargoPodKinds = ["ammo_bank", "fuel_tank", "cargo_hold"] as const;
export const cargoPodKindDecoder = z.union([
	z.literal("ammo_bank"),
	z.literal("fuel_tank"),
	z.literal("cargo_hold"),
]);

export type CargoPodKind = (typeof cargoPodKinds)[number];
