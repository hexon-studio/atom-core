import type { PublicKey } from "@solana/web3.js";
import { startMining } from "../core/actions/startMining";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
	globalOpts: GlobalOptions;
};

export const runStartMining = async ({
	fleetNameOrAddress,
	resourceMint,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		startMining({
			fleetNameOrAddress,
			resourceMint,
		}),
	)(globalOpts);
