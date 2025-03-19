import type { PublicKey } from "@solana/web3.js";
import { loadCargo } from "../core/actions/loadCargo";
import type { GlobalOptions } from "../types";
import type { LoadResourceInput } from "../utils/decoders";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	items: Array<LoadResourceInput>;
	globalOpts: GlobalOptions;
};

export const runLoadCargo = async ({
	fleetNameOrAddress,
	items,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		loadCargo({
			fleetNameOrAddress,
			items,
		}),
	)(globalOpts);
