import { Data } from "effect";

export class GetSurveyDataUnitTrackerError extends Data.TaggedError(
	"GetSurveyDataUnitTrackerError",
)<{ error: unknown }> {
	override get message() {
		return `Error getting survey data unit tracker: ${this.error}`;
	}
}

export class GetSurveyDataUnitTrackerNotFoundError extends Data.TaggedError(
	"GetSurveyDataUnitTrackerNotFoundError",
) {}

export class NotEnoughFoodForScanError extends Data.TaggedError(
	"NotEnoughFoodForScanError",
)<{ foodAmount: string; scanCost: string }> {
	override get message() {
		return `Insufficient food to start scanning. Available: ${this.foodAmount}, Required: ${this.scanCost}`;
	}
}

export class NotEnoughCargoSpaceForScanError extends Data.TaggedError(
	"NotEnoughCargoSpaceForScanError",
) {}
