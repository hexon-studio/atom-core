import type { PublicKey } from "@solana/web3.js";
import { CargoPod, CargoType } from "@staratlas/cargo";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";

export const getCargoTypeAddress = (
	mint: PublicKey,
	cargoStatsDefinitionAddress: PublicKey,
	cargoStatsDefinitionseqId = 0,
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [cargoType] = CargoType.findAddress(
					programs.cargo,
					cargoStatsDefinitionAddress,
					mint,
					cargoStatsDefinitionseqId,
				);

				return cargoType;
			}),
		),
	);

export const getCargoPodAddress = (podSeeds: Buffer) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [cargoPod] = CargoPod.findAddress(programs.cargo, podSeeds);

				return cargoPod;
			}),
		),
	);
