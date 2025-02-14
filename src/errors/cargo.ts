import { Data } from "effect";

export class GetCargoPodsByAuthorityError extends Data.TaggedError(
	"GetCargoPodsByAuthorityError",
)<{ error: unknown }> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}
