import type { PublicKey } from "@solana/web3.js";
import { Data, Effect, Option, Ref } from "effect";
import type { GameContext } from "../..";
import { getGameAccount } from "../../../../fleet-utils/accounts";
import { findGame } from "../findGame";

export class AlreadyInitializedError extends Data.TaggedError(
	"AlreadyInitializedError",
) {}

export const initGame = (
	owner: PublicKey,
	playerProfile: PublicKey,
	contextRef: Ref.Ref<Option.Option<GameContext>>,
) =>
	Effect.gen(function* () {
		const context = yield* Ref.get(contextRef);

		if (Option.isSome(context)) {
			return yield* Effect.fail(new AlreadyInitializedError());
		}

		const gameAccount = yield* findGame;

		const game = yield* getGameAccount(gameAccount.publicKey);

		// const planets = yield* findPlanets();

		// const planetsLookup = yield* Effect.reduce(
		//   planets,
		//   {} as Record<string, PublicKey>,
		//   (lookup, planetAccount) => {
		//     const pubkey = planetAccount.publicKey;
		//     const planet = planetAccount.account;

		//     if (planet.planetType === PlanetType.AsteroidBelt) {
		//       const sector = planet.sector.toString();
		//       lookup[sector] = pubkey;
		//     }

		//     return Effect.succeed(lookup);
		//   }
		// );

		return yield* Ref.updateAndGet(contextRef, () =>
			Option.some({
				game,
				playerProfile,
				owner,
				planetsLookup: {},
			}),
		);
	});

export type InitGame = typeof initGame;
