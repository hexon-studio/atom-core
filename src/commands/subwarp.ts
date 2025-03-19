import type { PublicKey } from "@solana/web3.js";
import { subwarpToSector } from "../core/actions/subwarpToSector";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	targetSector: [number, number];
	globalOpts: GlobalOptions;
};

export const runSubwarp = async ({
	fleetNameOrAddress,
	targetSector,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		subwarpToSector({
			fleetNameOrAddress,
			targetSector,
		}),
	)(globalOpts);
