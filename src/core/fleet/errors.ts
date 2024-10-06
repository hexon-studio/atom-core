import type { FleetStateData } from "@staratlas/sage";
import type BN from "bn.js";
import { Data } from "effect";

export class FleetNotIdleError extends Data.TaggedError("FleetNotIdleError") {}

export class FleetNotInStarbaseError extends Data.TaggedError(
	"FleetNotInStarbaseError",
) {}

export class PlanetNotFoundInSectorError extends Data.TaggedError(
	"PlanetNotFoundInSectorError",
)<{ sector: [BN, BN] }> {
	override get message() {
		return `Planet not found in sector: ${this.sector[0]}, ${this.sector[1]}`;
	}
}

export class FleetNotEnoughFuelError extends Data.TaggedError(
	"FuelNotEnoughError",
) {}

export class FleetNotMiningError extends Data.TaggedError(
	"FleetNotMiningError",
) {}

export class InvalidFleetStateError extends Data.TaggedError(
	"InvalidFleetStateError",
)<{ state: keyof FleetStateData; reason?: string }> {
	override get message() {
		return `Invalid fleet state: ${this.state}, reason: ${this.reason}`;
	}
}
