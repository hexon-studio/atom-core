import type { PublicKey } from "@solana/web3.js";
import { dockToStarbase } from "../core/actions/dockToStarbase";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const runDock = async ({ fleetNameOrAddress, globalOpts }: Param) =>
	makeAtomCommand(() =>
		dockToStarbase({
			fleetNameOrAddress,
		}),
	)(globalOpts);
