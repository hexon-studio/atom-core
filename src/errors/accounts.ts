import { Data } from "effect";
import type { PublicKey } from "@solana/web3.js";

export class GameAccountError extends Data.TaggedError("GameAccountError")<{
	readonly error: unknown;
	readonly gamePublicKey: PublicKey;
}> {
	override get message() {
		return `Failed to get game account for ${this.gamePublicKey.toString()}, ${this.error}`;
	}
}

export class GameStateAccountError extends Data.TaggedError(
	"GameStateAccountError",
)<{
	readonly error: unknown;
	readonly gameStatePublicKey: PublicKey;
}> {
	override get message() {
		return `Failed to get game state account for ${this.gameStatePublicKey.toString()}, ${this.error}`;
	}
}

export class FleetAccountError extends Data.TaggedError("FleetAccountError")<{
	readonly error: unknown;
	readonly fleetPubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get fleet account for ${this.fleetPubkey.toString()}, ${this.error}`;
	}
}

export class MineItemAccountError extends Data.TaggedError(
	"MineItemAccountError",
)<{
	readonly error: unknown;
	readonly mineItemPubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get mine item account for ${this.mineItemPubkey.toString()}, ${this.error}`;
	}
}

export class PlanetAccountError extends Data.TaggedError("PlanetAccountError")<{
	readonly error: unknown;
	readonly planetPubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get planet account for ${this.planetPubkey.toString()}, ${this.error}`;
	}
}

export class ResourceAccountError extends Data.TaggedError(
	"ResourceAccountError",
)<{
	readonly error: unknown;
	readonly resourcePubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get resource account for ${this.resourcePubkey.toString()}, ${this.error}`;
	}
}

export class SectorAccountError extends Data.TaggedError("SectorAccountError")<{
	readonly error: unknown;
	readonly sectorPubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get sector account for ${this.sectorPubkey.toString()}, ${this.error}`;
	}
}

export class StarbaseAccountError extends Data.TaggedError(
	"StarbaseAccountError",
)<{
	readonly error: unknown;
	readonly starbasePubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get starbase account for ${this.starbasePubkey.toString()}, ${this.error}`;
	}
}

export class StarbasePlayerAccountError extends Data.TaggedError(
	"StarbasePlayerAccountError",
)<{
	readonly error: unknown;
	readonly starbasePlayerPubkey: PublicKey;
}> {
	override get message() {
		return `Failed to get starbase player account for ${this.starbasePlayerPubkey.toString()}, ${this.error}`;
	}
}

export class FleetAccountByNameError extends Data.TaggedError(
	"FleetAccountByNameError",
)<{
	readonly error: unknown;
	readonly fleetName: string;
}> {
	override get message() {
		return `Failed to get fleet account for fleet name ${this.fleetName}, ${this.error}`;
	}
}
