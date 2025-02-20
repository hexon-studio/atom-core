import { PublicKey, type PublicKeyInitData } from "@solana/web3.js";

export const isPublicKey = (key: PublicKeyInitData): key is PublicKey => {
	try {
		new PublicKey(key);

		return true;
	} catch {
		return false;
	}
};
