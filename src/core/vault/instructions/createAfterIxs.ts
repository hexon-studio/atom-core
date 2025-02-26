import { Effect } from "effect";
import { createDrainVaultIxs } from "./createDrainVaultIxs";
import { createTrackingIxs } from "./createTrackingIxs";

export const createAfterIxs = () =>
	Effect.gen(function* () {
		const drainVaultIxs = yield* createDrainVaultIxs();
		const trackingIxs = yield* createTrackingIxs();

		return [...drainVaultIxs, ...trackingIxs];
	});
