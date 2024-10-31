import type { PublicKey } from "@solana/web3.js";
import { Match } from "effect";
import { resourceNameToMint } from "../../constants/resources";
import type { CargoPodKind } from "../../decoders";

export const isResourceAllowedForCargoPod = (resourceMint: PublicKey) =>
	Match.type<CargoPodKind>().pipe(
		Match.when("fuel_tank", () => resourceMint.equals(resourceNameToMint.Fuel)),
		Match.when("ammo_bank", () =>
			resourceMint.equals(resourceNameToMint.Ammunition),
		),
		Match.when("cargo_hold", () => true),
		Match.exhaustive,
	);
