import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { stopCrafting } from "~/core/actions/stopCrafting";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	recipe: PublicKey;
	craftingId: number;
	starbaseCoords: [BN, BN];
	globalOpts: GlobalOptions;
};

export const runStopCrafting = async ({
	craftingId,
	recipe,
	starbaseCoords,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		stopCrafting({
			craftingId: new BN(craftingId),
			recipe,
			starbaseCoords,
		}),
	)(globalOpts);
