import { Data } from "effect";

export class FireWebhookEventError extends Data.TaggedError(
	"FireWebhookEventError",
)<{ error: unknown }> {
	override get message() {
		const errorMsg =
			this.error instanceof Error ? this.error.message : String(this.error);
		return `Failed to send webhook notification. Please verify your webhook configuration and ensure the endpoint is accessible. ${errorMsg}`;
	}
}
