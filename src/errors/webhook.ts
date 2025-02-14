import { Data } from "effect";

export class FireWebhookEventError extends Data.TaggedError(
	"FireWebhookEventError",
)<{ error: unknown }> {
	override get message() {
		return `Fail to fire webhook event: ${this.error}`;
	}
}
