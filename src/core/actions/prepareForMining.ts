import BN from "bn.js";
import { Effect, pipe } from "effect";
import type { ResourceName } from "../../constants/resources";
import { getFleetAddressByName } from "../fleet-utils/addresses";
import { getTimeAndNeededResourcesToFullCargoInMining } from "../fleet-utils/instructions";

export const prepareForMining = (
	fleetName: string,
	resource: ResourceName,
	[x, y]: [number, number],
) =>
	pipe(
		getFleetAddressByName(fleetName),
		Effect.flatMap((fleetAddress) =>
			getTimeAndNeededResourcesToFullCargoInMining(fleetAddress, resource, [
				new BN(x),
				new BN(y),
			]),
		),
	);
