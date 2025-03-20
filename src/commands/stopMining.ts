import type { PublicKey } from "@solana/web3.js";
import { stopMining } from "../core/actions/stopMining";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const runStopMining = async ({
	fleetNameOrAddress,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		stopMining({
			fleetNameOrAddress,
		}),
	)(globalOpts);
