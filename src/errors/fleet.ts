import type { PublicKey } from "@solana/web3.js";
import type { FleetStateData } from "@staratlas/sage";
import { Data } from "effect";
import type { CargoPodKind } from "~/utils/decoders";

export class FleetRentPermissionError extends Data.TaggedError(
	"FleetRentPermissionError",
) {
	override get message() {
		return "The user profile has not enough permission on this rented fleet, mybe the rent is over";
	}
}

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
		return `Fleet crew is not normalized. Crew in fleet: ${this.crewCount}, Required: ${this.requiredCrew}`;
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
		return `Fleet does not have enough space for ${this.cargoKind}. Available: ${this.amountAvailable}, Required: ${this.amountAdded}`;
	}
}

export class InvalidFleetStateError extends Data.TaggedError(
	"InvalidFleetStateError",
)<{ state: keyof FleetStateData; reason?: string }> {
	override get message() {
		return `Fleet cannot perform this action in its current state (${this.state}).${this.reason ? ` Reason: ${this.reason}` : ""}`;
	}
}

export class FleetNotEnoughFuelError extends Data.TaggedError(
	"FuelNotEnoughError",
)<{
	readonly action: string;
	readonly requiredFuel: string;
	readonly availableFuel: string;
}> {
	override get message() {
		return `Fleet does not have enough fuel to ${this.action}. Available: ${this.availableFuel}, Required: ${this.requiredFuel}`;
	}
}

export class FleetInvalidResourceForPodKindError extends Data.TaggedError(
	"FleetInvalidResourceForPodKindError",
)<{ cargoPodKind: CargoPodKind; resourceMint: PublicKey }> {
	override get message() {
		return `Invalid resource for cargo pod kind. Cargo pod kind: ${this.cargoPodKind}, Resource mint: ${this.resourceMint.toString()}`;
	}
}

export class FleetCooldownError extends Data.TaggedError("FleetCooldownError")<{
	cooldownExpiresAt: string;
}> {
	override get message() {
		return `Fleet is currently on cooldown and cannot perform this action until ${this.cooldownExpiresAt}.`;
	}
}

export class SectorTooFarError extends Data.TaggedError("SectorTooFarError")<{
	readonly maxAllowedDistance: number;
	readonly targetSectorDistance: number;
}> {
	override get message() {
		return `Target sector is too far. Distance: ${this.targetSectorDistance} AU, Max allowed distance: ${this.maxAllowedDistance} AU`;
	}
}

export class FleetIsMovingError extends Data.TaggedError("FleetIsMovingError")<{
	readonly arrivalTime: string;
	readonly movementType: "Subwarp" | "Warp";
}> {
	override get message() {
		return `Fleet is in ${this.movementType.toLowerCase()} movement and will arrive at ${this.arrivalTime}`;
	}
}
