import { Data } from "effect";

export class AccountError extends Data.TaggedError("AccountError")<{
	readonly error: unknown;
	readonly reason: string;
	readonly keyOrName: string;
}> {
	override get message() {
		return `${this.reason} for ${this.keyOrName}, ${this.error}`;
	}
}
