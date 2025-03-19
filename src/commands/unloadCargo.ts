import type { PublicKey } from "@solana/web3.js";
import type { UnloadResourceInput } from "~/utils/decoders";
import { unloadCargo } from "../core/actions/unloadCargo";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	items: Array<UnloadResourceInput>;
	globalOpts: GlobalOptions;
};

export const runUnloadCargo = async ({
	fleetNameOrAddress,
	items,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		unloadCargo({
			fleetNameOrAddress,
			items,
		}),
	)(globalOpts);
