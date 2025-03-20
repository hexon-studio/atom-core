import type { PublicKey } from "@solana/web3.js";
import { loadCrew } from "~/core/actions/loadCrew";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	crewAmount: number;
	globalOpts: GlobalOptions;
};

export const runLoadCrew = async ({
	fleetNameOrAddress,
	crewAmount,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		loadCrew({
			fleetNameOrAddress,
			crewAmount,
		}),
	)(globalOpts);
