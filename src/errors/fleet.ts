import type { PublicKey } from "@solana/web3.js";
import type { FleetStateData } from "@staratlas/sage";
import { Data } from "effect";
import type { CargoPodKind } from "~/utils/decoders";

export class FindFleetsError extends Data.TaggedError("FindFleetsError")<{
	readonly error: unknown;
}> {}

export class FleetCrewNotNormalizedError extends Data.TaggedError(
	"FleetCrewNotNormalizedError",
)<{
	crewCount: string;
	requiredCrew: string;
}> {
	override get message() {
		return `Fleet crew is not normalized: ${this.crewCount} < ${this.requiredCrew}`;
	}
}

export class FleetNotEnoughSpaceError extends Data.TaggedError(
	"FleetNotEnoughSpaceError",
)<{
	cargoKind: CargoPodKind;
	amountAvailable: string;
	amountAdded: string;
}> {
	override get message() {
		return `Fleet does not have enough space for ${this.cargoKind}: ${this.amountAvailable} < ${this.amountAdded}`;
	}
}

export class InvalidFleetStateError extends Data.TaggedError(
	"InvalidFleetStateError",
)<{ state: keyof FleetStateData; reason?: string }> {
	override get message() {
		return `Invalid fleet state: ${this.state}, reason: ${this.reason}`;
	}
}

// TODO: replace with ResourceNotEnoughError
export class FleetNotEnoughFuelError extends Data.TaggedError(
	"FuelNotEnoughError",
) {}

export class FleetInvalidResourceForPodKindError extends Data.TaggedError(
	"FleetInvalidResourceForPodKindError",
)<{ cargoPodKind: CargoPodKind; resourceMint: PublicKey }> {
	override get message() {
		return `Invalid resource for cargo pod kind: ${this.cargoPodKind}, ${this.resourceMint.toString()}`;
	}
}

export class FleetCooldownError extends Data.TaggedError("FleetCooldownError")<{
	cooldownExpiresAt: string;
}> {
	override get message() {
		return `Fleet is on cooldown until ${this.cooldownExpiresAt}`;
	}
}

export class SectorTooFarError extends Data.TaggedError("SectorTooFarError") {}
