import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import { Effect, pipe } from "effect";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

export const createIdleToLoadingBayIx = ({
	fleet,
	input,
	starbase,
	starbasePlayer,
	playerProfile,
	profileFaction,
}: {
	playerProfile: PublicKey;
	profileFaction: PublicKey;
	fleet: PublicKey;
	starbase: PublicKey;
	starbasePlayer: PublicKey;
	input: 0 | 1; // LoadingBayToIdleInput
}) =>
	Effect.gen(function* () {
		const programs = yield* SagePrograms;

		const [context, signer] = yield* pipe(
			GameService,
			Effect.flatMap((service) =>
				Effect.all([getGameContext(), service.signer]),
			),
		);

		return yield* Effect.succeed(
			Fleet.idleToLoadingBay(
				programs.sage,
				signer,
				playerProfile,
				profileFaction,
				fleet,
				starbase,
				starbasePlayer,
				context.game.key,
				context.game.data.gameState,
				input,
			),
		);
	});
