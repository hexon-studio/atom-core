import { PublicKey, type PublicKeyInitData } from "@solana/web3.js";
import { InvalidArgumentError } from "commander";

export const isPublicKey = (key: PublicKeyInitData): boolean => {
	try {
		new PublicKey(key);

		return true;
	} catch {
		return false;
	}
};

export const parsePublicKey = (key: PublicKeyInitData): PublicKey => {
	if (!isPublicKey(key)) {
		throw new InvalidArgumentError("Invalid public key");
	}

	return new PublicKey(key);
};
