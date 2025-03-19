import type { PublicKey } from "@solana/web3.js";
import { undockFromStarbase } from "../core/actions/undockFromStarbase";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const runUndock = async ({ fleetNameOrAddress, globalOpts }: Param) =>
	makeAtomCommand(() =>
		undockFromStarbase({
			fleetNameOrAddress,
		}),
	)(globalOpts);
