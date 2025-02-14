import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { Data } from "effect";
import { type ResourceMint, resourceMintToName } from "~/constants/resources";

export class FindAssociatedTokenPdaError extends Data.TaggedError(
	"FindAssociatedTokenPdaError",
)<{
	readonly error: unknown;
}> {}

export class GameNotInitializedError extends Data.TaggedError(
	"GameNotInitializedError",
) {}

export class GetParsedTokenAccountsByOwnerError extends Data.TaggedError(
	"GetParsedTokenAccountsByOwnerError",
)<{ readonly error: unknown }> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}

export class CreateAssociatedTokenAccountIdempotentError extends Data.TaggedError(
	"CreateAssociatedTokenAccountIdempotentError",
)<{ readonly error: unknown }> {}

export class GameNotFoundError extends Data.TaggedError("GameNotFoundError")<{
	readonly error: unknown;
}> {}

export class ReadFromRPCError extends Data.TaggedError("ReadFromRPCError")<{
	readonly error: unknown;
	readonly accountName: string;
}> {
	override get message() {
		return `Error reading: ${this.accountName}, from RPC: ${this.error}`;
	}
}

export class FindPdaError extends Data.TaggedError("FindPdaError")<{
	error: unknown;
}> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}

export class FetchGameInfoError extends Data.TaggedError("FetchGameInfoError")<{
	error: unknown;
}> {}

export class GameInfoDecodeError extends Data.TaggedError(
	"DecodeGameInfoError",
)<{
	error: unknown;
}> {}

export class FindPlanetsError extends Data.TaggedError("FindPlanetsError")<{
	readonly error: unknown;
}> {}

export class GameAlreadyInitializedError extends Data.TaggedError(
	"GameAlreadyInitializedError",
) {}

export class AtlasNotEnoughError extends Data.TaggedError(
	"AtlasNotEnoughError",
) {}

export class SolNotEnoughError extends Data.TaggedError("SolNotEnoughError") {}

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

export class PlanetNotFoundInSectorError extends Data.TaggedError(
	"PlanetNotFoundInSectorError",
)<{ sector: [BN, BN] }> {
	override get message() {
		return `Planet not found in sector: ${this.sector[0]}, ${this.sector[1]}`;
	}
}
