import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import { InvalidOptionArgumentError } from "commander";

export const parseSecretKey = (encodedSecretKey: string) => {
	try {
		return Keypair.fromSecretKey(base58.decode(encodedSecretKey));
	} catch (e) {
		throw new InvalidOptionArgumentError("Invalid keypair");
	}
};
