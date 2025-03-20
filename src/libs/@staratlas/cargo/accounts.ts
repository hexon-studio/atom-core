import type { PublicKey } from "@solana/web3.js";
import { CargoPod, CargoStatsDefinition, CargoType } from "@staratlas/cargo";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { readFromSage } from "~/libs/@staratlas/data-source";

export const fetchCargoPodAccount = (cargoPodPublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.cargo, cargoPodPublicKey, CargoPod),
		),
	);

export const fetchCargoTypeAccount = (cargoTypePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(programs.cargo, cargoTypePublicKey, CargoType),
		),
	);

export const fetchCargoStatsDefinitionAccount = (
	cargoStatsDefPublicKey: PublicKey,
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(
				programs.cargo,
				cargoStatsDefPublicKey,
				CargoStatsDefinition,
			),
		),
	);
