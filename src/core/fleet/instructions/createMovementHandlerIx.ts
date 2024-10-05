import { Fleet } from "@staratlas/sage";
import { Effect, Match } from "effect";
import { resourceNameToMint } from "../../../constants/resources";
import {
	getCouncilRankXpKey,
	getPilotXpKey,
} from "../../points-utils/accounts";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getCargoTypeAddress } from "../../utils/pdas";

export const createMovementHandlerIx = (fleetAccount: Fleet) =>
	Effect.gen(function* () {
		const gameService = yield* GameService;
		const programs = yield* SagePrograms;
		const context = yield* getGameContext();

		const ixs = [];

		const { address: fuelTankAta, instructions } =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Fuel,
				fleetAccount.data.fuelTank,
				true,
			);

		ixs.push(instructions);

		const pilotXpKey = yield* getPilotXpKey(context.playerProfile);
		const councilRankXpKey = yield* getCouncilRankXpKey(context.playerProfile);

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Fuel,
			context.cargoStatsDefinition,
		);

		const maybeMoveHandlerIx = Match.value(fleetAccount.state).pipe(
			Match.when({ MoveWarp: {} }, () =>
				Fleet.moveWarpHandler(
					programs.sage,
					programs.points,
					context.playerProfile,
					fleetAccount.key,
					pilotXpKey,
					// @ts-ignore
					context.game.data.points.pilotXpCategory.category,
					// @ts-ignore
					context.game.data.points.pilotXpCategory.modifier,
					councilRankXpKey,
					// @ts-ignore
					context.game.data.points.councilRankXpCategory.category,
					// @ts-ignore
					context.game.data.points.councilRankXpCategory.modifier,
					context.game.key,
				),
			),
			Match.when({ MoveSubwarp: {} }, () =>
				Fleet.movementSubwarpHandler(
					programs.sage,
					programs.cargo,
					programs.points,
					context.playerProfile,
					fleetAccount.key,
					fleetAccount.data.fuelTank,
					cargoTypeAddress,
					context.cargoStatsDefinition.key,
					fuelTankAta,
					resourceNameToMint.Fuel,
					pilotXpKey,
					// @ts-ignore
					context.game.data.points.pilotXpCategory.category,
					// @ts-ignore
					context.game.data.points.pilotXpCategory.modifier,
					councilRankXpKey,
					// @ts-ignore
					context.game.data.points.councilRankXpCategory.category,
					// @ts-ignore
					context.game.data.points.councilRankXpCategory.modifier,
					context.game.key,
				),
			),
			Match.orElse(() => null),
		);

		return maybeMoveHandlerIx ? [...ixs, maybeMoveHandlerIx] : [];
	});
