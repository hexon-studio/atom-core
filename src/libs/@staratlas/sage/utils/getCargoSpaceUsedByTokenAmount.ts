import type { CargoType } from "@staratlas/cargo";
import { getCargoSpaceUsedByTokenAmount } from "@staratlas/sage";
import type BN from "bn.js";

export const getCargoUnitsFromTokenAmount = ({
	cargoType,
	amount,
}: { cargoType: CargoType; amount: BN }) =>
	getCargoSpaceUsedByTokenAmount(cargoType, amount);
