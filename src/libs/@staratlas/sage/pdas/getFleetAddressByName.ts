import { stringToByteArray } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";

export const getFleetAddressByName = (fleetName: string) =>
	Effect.all([getSagePrograms(), getGameContext()]).pipe(
		Effect.flatMap(([programs, context]) =>
			Effect.try(() => {
				const fleetLabel = stringToByteArray(fleetName, 32);

				const [fleet] = Fleet.findAddress(
					programs.sage,
					context.gameInfo.game.key,
					context.playerProfile.key,
					fleetLabel,
				);

				return fleet;
			}),
		),
	);
