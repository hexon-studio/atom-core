import type { PublicKey } from "@solana/web3.js";
import { Match } from "effect";
import type { CargoPodKind } from "~/utils/decoders";
import { resourceMintByName } from "~/utils/resources";

export const isResourceAllowedForCargoPod = (resourceMint: PublicKey) =>
	Match.type<CargoPodKind>().pipe(
		Match.when("fuel_tank", () =>
			resourceMint.equals(resourceMintByName("Fuel")),
		),
		Match.when("ammo_bank", () =>
			resourceMint.equals(resourceMintByName("Ammunition")),
		),
		Match.when("cargo_hold", () => true),
		Match.exhaustive,
	);
