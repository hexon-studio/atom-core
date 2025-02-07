import type { PublicKey } from "@solana/web3.js";
import type { FleetStateData } from "@staratlas/sage";
import type BN from "bn.js";
import { Data } from "effect";
import {
	type ResourceMint,
	resourceMintToName,
} from "../../constants/resources";
import type {
	CargoPodKind,
	LoadResourceInput,
	UnloadResourceInput,
} from "../../decoders";

export class ResourceNotEnoughError extends Data.TaggedError(
	"ResourceNotEnoughError",
)<{
	from: "starbase" | "fleet";
	entity: PublicKey;
	resourceMint: PublicKey;
	amountAvailable: string;
	amountAdded: string;
}> {
	override get message() {
		return `Entity (${this.from} - ${this.entity.toString()}) does not have enough resources for ${resourceMintToName[this.resourceMint.toString() as ResourceMint]}: ${this.amountAvailable} < ${this.amountAdded}`;
	}
}

export class FleetNotNormalizedCrewError extends Data.TaggedError(
	"FleetNotNormalizedCrewError",
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

export class FleetNotEnoughSpaceFixedError extends Data.TaggedError(
	"FleetNotEnoughSpaceFixedError",
)<{
	cargoKind: CargoPodKind;
	amountAvailable: string;
	amountAdded: string;
}> {
	override get message() {
		return `Fleet does not have enough space for ${this.cargoKind}: ${this.amountAvailable} < ${this.amountAdded}`;
	}
}

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

export class InvalidFleetStateError extends Data.TaggedError(
	"InvalidFleetStateError",
)<{ state: keyof FleetStateData; reason?: string }> {
	override get message() {
		return `Invalid fleet state: ${this.state}, reason: ${this.reason}`;
	}
}

export class InvalidAmountError extends Data.TaggedError("InvalidAmountError")<{
	resourceMint?: PublicKey;
	amount?: string;
}> {
	override get message() {
		if (this.resourceMint && this.amount !== undefined) {
			return `Invalid amount for resource ${this.resourceMint.toString()}: ${this.amount}`;
		}

		return "Invalid amount for resource";
	}
}

export class InvalidResourceForPodKindError extends Data.TaggedError(
	"InvalidResourceForPodKind",
)<{ cargoPodKind: CargoPodKind; resourceMint: PublicKey }> {
	override get message() {
		return `Invalid resource for cargo pod kind: ${this.cargoPodKind}, ${this.resourceMint.toString()}`;
	}
}

export class FleetWarpCooldownError extends Data.TaggedError(
	"FleetWarpCooldownError",
)<{ warpCooldownExpiresAt: string }> {
	override get message() {
		return `Fleet warp is on cooldown until ${this.warpCooldownExpiresAt}`;
	}
}

export class LoadUnloadPartiallyFailedError extends Data.TaggedError(
	"LoadUnloadPartiallyFailedError",
)<{
	signatures: string[];
	errors: Error[];
	context: {
		missingResources: Array<LoadResourceInput | UnloadResourceInput>;
	};
}> {
	override get message() {
		return this.errors.map((error) => error.message).join("\n");
	}
}

export class LoadUnloadFailedError extends Data.TaggedError(
	"LoadUnloadFailedError",
)<{
	errors: Error[];
}> {
	override get message() {
		return this.errors.map((error) => error.message).join("\n");
	}
}

export class GetSurveyDataUnitTrackerError extends Data.TaggedError(
	"GetSurveyDataUnitTrackerError",
)<{ error: unknown }> {
	override get message() {
		return `Error getting survey data unit tracker: ${this.error}`;
	}
}

export class GetSurveyDataUnitTrackerNotFoundError extends Data.TaggedError(
	"GetSurveyDataUnitTrackerNotFoundError",
) {}

export class FleetScanCooldownError extends Data.TaggedError(
	"FleetScanCooldownError",
)<{ scanCooldownExpiresAt: string }> {
	override get message() {
		return `Fleet warp is on cooldown until ${this.scanCooldownExpiresAt}`;
	}
}

export class NotEnoughFoodForScanError extends Data.TaggedError(
	"NotEnoughFoodForScanError",
)<{ foodAmount: string; scanCost: string }> {
	override get message() {
		return `Not enough food to start scan: ${this.foodAmount} < ${this.scanCost}`;
	}
}

export class NotEnoughCargoSpaceForScanError extends Data.TaggedError(
	"NotEnoughCargoSpaceForScanError",
) {}

export class SectorTooFarError extends Data.TaggedError("SectorTooFarError") {}
