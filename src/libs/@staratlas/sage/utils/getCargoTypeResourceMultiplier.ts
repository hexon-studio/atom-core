import type { CargoType } from "@staratlas/cargo";
import { SAGE_CARGO_STAT_VALUE_INDEX } from "@staratlas/sage";
import BN from "bn.js";

export const getCargoTypeResourceMultiplier = (cargoType: CargoType) =>
	cargoType.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(1);
