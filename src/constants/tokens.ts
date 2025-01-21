import { PublicKey } from "@solana/web3.js";

export const tokenMints = {
	atlas: new PublicKey("ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx"),
	polis: new PublicKey("poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk"),
} as const;

export const noopPublicKey = new PublicKey("11111111111111111111111111111111");

export const MIN_ATLAS_QTY = 100;
export const ATLAS_DECIMALS = 10 ** 8;

export const MIN_SOL_QTY = 0.0025;
