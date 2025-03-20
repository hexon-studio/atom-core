import type { PublicKey } from "@solana/web3.js";
import { byteArrayToString } from "@staratlas/data-source";
import { Console, Effect } from "effect";
import { fetchFleetAccountByNameOrAddress } from "~/libs/@staratlas/sage";
import { jsonStringify } from "~/utils/jsonStringify";
import type { GlobalOptions } from "../types";
import { makeAtomCommand } from "./makeAtomCommand";

type Param = {
	fleetNameOrAddress: string | PublicKey;
	globalOpts: GlobalOptions;
};

export const runFleetInfo = async ({ fleetNameOrAddress, globalOpts }: Param) =>
	makeAtomCommand(() =>
		fetchFleetAccountByNameOrAddress(fleetNameOrAddress).pipe(
			Effect.map((fleet) =>
				jsonStringify({
					state: fleet.state,
					data: {
						...fleet.data,
						fleetLabel: byteArrayToString(fleet.data.fleetLabel),
					},
				}),
			),
			Effect.tap(Console.log),
		),
	)(globalOpts);
