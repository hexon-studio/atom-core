import { Data } from "effect";

export class GetCargoPodsByAuthorityError extends Data.TaggedError(
	"GetCargoPodsByAuthorityError",
)<{ error: unknown }> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Failed to get cargo pods by authority. ${errorMsg}`;
	}
}
