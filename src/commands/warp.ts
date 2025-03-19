import type { PublicKey } from "@solana/web3.js";
import { warpToSector } from "../core/actions/warpToSector";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
	globalOpts: GlobalOptions;
};

export const runWarp = async ({
	fleetNameOrAddress,
	targetSector,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		warpToSector({
			fleetNameOrAddress,
			targetSector,
		}),
	)(globalOpts);
