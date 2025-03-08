import type { PublicKey } from "@solana/web3.js";
import type { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import type { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import {
	FleetRentPermissionError,
	type GameNotInitializedError,
} from "~/errors";

const isFleetRented = (fleetAccount: Fleet) => (playerProfile: PublicKey) =>
	!fleetAccount.data.ownerProfile.equals(playerProfile);

export const isFleetRentValid =
	(fleetAccount: Fleet) => (playerProfile: PublicKey) =>
		fleetAccount.data.subProfile.key.equals(playerProfile);

export const assertRentIsValid = (
	fleet: Fleet,
): Effect.Effect<
	void,
	FleetRentPermissionError | GameNotInitializedError,
	GameService
> =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const isRented = isFleetRented(fleet)(context.playerProfile.key);

		if (!isRented) {
			return;
		}

		yield* Effect.log("Fleet is rented, checking permissions...");

		if (isFleetRentValid(fleet)(context.playerProfile.key)) {
			yield* Effect.log("Fleet rent valid.");

			return;
		}

		yield* Effect.log("Fleet is rented is not valid");

		return yield* new FleetRentPermissionError();
	});
