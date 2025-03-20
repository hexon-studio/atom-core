import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { startCrafting } from "~/core/actions/startCrafting";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	crewAmount: number;
	quantity: number;
	recipe: PublicKey;
	starbaseCoords: [BN, BN];
	globalOpts: GlobalOptions;
};

export const runStartCrafting = async ({
	crewAmount,
	quantity,
	recipe,
	starbaseCoords,
	globalOpts,
}: Param) =>
	makeAtomCommand(() =>
		startCrafting({
			crewAmount,
			quantity,
			recipe,
			starbaseCoords,
		}),
	)(globalOpts);
