import { Data } from "effect";

export class FleetNotIdleError extends Data.TaggedError("FleetNotIdleError") {}

export class FleetNotInStarbaseError extends Data.TaggedError(
	"FleetNotInStarbaseError",
) {}
