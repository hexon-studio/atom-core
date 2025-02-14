import type { PublicKey } from "@solana/web3.js";
import { CargoPod, CargoType } from "@staratlas/cargo";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { FindPdaError } from "~/errors";

export const findCargoTypePda = (
	mint: PublicKey,
	cargoStatsDefinitionAddress: PublicKey,
	cargoStatsDefinitionseqId = 0,
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try({
				try: () =>
					CargoType.findAddress(
						programs.cargo,
						cargoStatsDefinitionAddress,
						mint,
						cargoStatsDefinitionseqId,
					),
				catch: (error) => new FindPdaError({ error }),
			}),
		),
	);

export const findCargoPodPda = (podSeeds: Buffer) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try({
				try: () => CargoPod.findAddress(programs.cargo, podSeeds),
				catch: (error) => new FindPdaError({ error }),
			}),
		),
	);
