import type { PublicKey } from "@solana/web3.js";
import { UserPoints } from "@staratlas/points";
import { Effect } from "effect";
import { SagePrograms } from "../programs";
import { gameContext } from "../services/GameService/utils";

export const getMiningXpKey = (playerProfilePublicKey: PublicKey) =>
	Effect.all([gameContext, SagePrograms]).pipe(
		Effect.flatMap(([context, programs]) =>
			Effect.try(() => {
				const [pubKey] = UserPoints.findAddress(
					programs.points,
					// @ts-ignore
					context.game.data.points.miningXpCategory.category,
					playerProfilePublicKey,
				);

				return pubKey;
			}),
		),
	);

export const getPilotXpKey = (playerProfilePublicKey: PublicKey) =>
	Effect.all([gameContext, SagePrograms]).pipe(
		Effect.flatMap(([context, programs]) =>
			Effect.try(() => {
				const [pubKey] = UserPoints.findAddress(
					programs.points,
					// @ts-ignore
					context.game.data.points.pilotXpCategory.category,
					playerProfilePublicKey,
				);
				return pubKey;
			}),
		),
	);

export const getCouncilRankXpKey = (playerProfilePublicKey: PublicKey) =>
	Effect.all([gameContext, SagePrograms]).pipe(
		Effect.flatMap(([context, programs]) =>
			Effect.try(() => {
				const [pubKey] = UserPoints.findAddress(
					programs.points,
					// @ts-ignore
					context.game.data.points.councilRankXpCategory.category,
					playerProfilePublicKey,
				);
				return pubKey;
			}),
		),
	);
