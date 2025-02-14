import type { PublicKey } from "@solana/web3.js";
import { Data } from "effect";
import type { LoadResourceInput, UnloadResourceInput } from "~/utils/decoders";

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
