import type { PublicKey } from "@solana/web3.js";
import { UserPoints } from "@staratlas/points";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";

export const findUserPointsPda = ({
	category,
	playerProfile,
}: {
	category:
		| "councilRankXp"
		| "craftingXp"
		| "dataRunningXp"
		| "lp"
		| "miningXp"
		| "pilotXp";
	playerProfile: PublicKey;
}) =>
	Effect.all([getGameContext(), getSagePrograms()]).pipe(
		Effect.flatMap(([context, programs]) =>
			Effect.try(() => {
				const categoryPublicKey =
					context.gameInfo.game.data.points[`${category}Category`].category;

				return UserPoints.findAddress(
					programs.points,
					categoryPublicKey,
					playerProfile,
				);
			}),
		),
	);
