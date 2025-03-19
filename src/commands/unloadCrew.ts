import type { PublicKey } from "@solana/web3.js";
import { unloadCrew } from "~/core/actions/unloadCrew";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	allowUnloadRequiredCrew: boolean;
	crewAmount: number;
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const runUnloadCrew = async ({
	fleetNameOrAddress,
	crewAmount,
	allowUnloadRequiredCrew,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		unloadCrew({
			fleetNameOrAddress,
			crewAmount,
			allowUnloadRequiredCrew,
		}),
	)(globalOpts);
