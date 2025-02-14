import { Data } from "effect";

export class CraftingOutputItemNotFoundError extends Data.TaggedError(
	"CraftingOutputItemNotFoundError",
) {}
