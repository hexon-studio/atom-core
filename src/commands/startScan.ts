import type { PublicKey } from "@solana/web3.js";
import { startScan } from "~/core/actions/startScan";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const runStartScan = async ({ fleetNameOrAddress, globalOpts }: Param) =>
	makeAtomCommand(() =>
		startScan({
			fleetNameOrAddress,
		}),
	)(globalOpts);
