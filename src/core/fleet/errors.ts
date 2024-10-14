import type { PublicKey } from "@solana/web3.js";
import type { FleetStateData } from "@staratlas/sage";
import type BN from "bn.js";
import { Data } from "effect";
import {
	type ResourceMint,
	resourceMintToName,
} from "../../constants/resources";
import type { CargoPodKind } from "../../types";

export class MissingInstructionsError extends Data.TaggedError(
	"MissingInstructionsError",
) {}

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

export class InvalidAmountError extends Data.TaggedError("InvalidAmountError")<{
	resourceMint?: PublicKey;
	amount?: number;
}> {
	override get message() {
		if (this.resourceMint && this.amount !== undefined) {
			return `Invalid amount for resource ${this.resourceMint.toString()}: ${this.amount}`;
		}

		return "Invalid amount for resource";
	}
}

export class InvalidResourceForPodKind extends Data.TaggedError(
	"InvalidResourceForPodKind",
) {}

export class StarbaseCargoPodTokenAccountNotFoundError extends Data.TaggedError(
	"StarbaseCargoPodTokenAccountNotFound",
) {}

export class FleetCargoPodFullError extends Data.TaggedError(
	"FleetCargoPodFullError",
)<{
	podKind: CargoPodKind;
}> {}

export class GetTokenBalanceError extends Data.TaggedError(
	"GetTokenBalanceError",
)<{
	error: unknown;
}> {}

export class StarbaseCargoPodEmptyError extends Data.TaggedError(
	"StarbaseCargoPodEmptyError",
)<{
	resourceMint: PublicKey;
}> {
	override get message() {
		return `Starbase cargo pod for ${resourceMintToName[this.resourceMint.toString() as ResourceMint]} is empty`;
	}
}
