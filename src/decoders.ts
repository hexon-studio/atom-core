import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

export const cargoPodKinds = ["ammo_bank", "fuel_tank", "cargo_hold"] as const;

export const cargoPodKindDecoder = z.enum(cargoPodKinds);

export type CargoPodKind = z.infer<typeof cargoPodKindDecoder>;

export const loadResourceDecoder = z.object({
	resourceMint: z.string().transform((value) => new PublicKey(value)),
	mode: z.union([
		z.literal("fixed"),
		z.literal("max"),
		z.literal("min"),
		z.literal("min-and-fill"),
	]),
	amount: z.number(),
	cargoPodKind: cargoPodKindDecoder,
});

export type LoadResourceInput = z.infer<typeof loadResourceDecoder>;

export const unloadResourceDecoder = z.object({
	resourceMint: z.string().transform((value) => new PublicKey(value)),
	mode: z.union([z.literal("fixed"), z.literal("max")]),
	amount: z.number(),
	cargoPodKind: cargoPodKindDecoder,
});

export type UnloadResourceInput = z.infer<typeof unloadResourceDecoder>;
