import type { PublicKey } from "@solana/web3.js";
import type BN from "bn.js";
import { Data } from "effect";
import { resourceNameByMint } from "~/utils";

export class FetchTokenBalanceError extends Data.TaggedError(
	"FetchTokenBalanceError",
)<{
	readonly error: unknown;
}> {}

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

export class ReadAllFromRPCError extends Data.TaggedError(
	"ReadAllFromRPCError",
)<{
	readonly error: unknown;
}> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Unable to read data from the network. ${errorMsg}`;
	}
}
export class ReadFromRPCError extends Data.TaggedError("ReadFromRPCError")<{
	readonly error: unknown;
	readonly accountName: string;
}> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Unable to read ${this.accountName} data from the network. ${errorMsg}`;
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
)<{
	readonly amountAvailable: string;
	readonly amountRequired: string;
}> {
	override get message() {
		return `Not enough ATLAS tokens available in the vault. Available: ${this.amountAvailable}, Required: ${this.amountRequired}`;
	}
}

export class SolNotEnoughError extends Data.TaggedError("SolNotEnoughError")<{
	readonly amountAvailable: string;
	readonly amountRequired: string;
}> {
	override get message() {
		return `Not enough SOL available in the hot wallet. Available: ${this.amountAvailable}, Required: ${this.amountRequired}`;
	}
}

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
		const location = this.from === "starbase" ? "Starbase" : "Fleet";
		const resourceName = resourceNameByMint(this.resourceMint);

		return `Insufficient ${resourceName} at ${location} (${this.entity.toString()}). Available: ${this.amountAvailable}, Required: ${this.amountAdded}.`;
	}
}

export class PlanetNotFoundInSectorError extends Data.TaggedError(
	"PlanetNotFoundInSectorError",
)<{ sector: [BN, BN] }> {
	override get message() {
		return `No planet found in sector [${this.sector[0]}, ${this.sector[1]}].`;
	}
}
