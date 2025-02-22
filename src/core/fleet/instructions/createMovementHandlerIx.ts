import { getAccount } from "@solana/spl-token";
import { Fleet } from "@staratlas/sage";
import { Effect, Match, Option } from "effect";
import { resourceMintByName } from "~/constants/resources";
import { getSagePrograms } from "~/core/programs";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import { findUserPointsPda } from "~/libs/@staratlas/points";

export const createMovementHandlerIx = (fleetAccount: Fleet) =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();
		const context = yield* getGameContext();

		const provider = yield* SolanaService.anchorProvider;

		const ixs = [];

		const createFuelFuelTankAta =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				resourceMintByName("Fuel"),
				fleetAccount.data.fuelTank,
				true,
			);

		const fuelTokenToAccount = yield* Effect.tryPromise(() =>
			getAccount(
				provider.connection,
				createFuelFuelTankAta.address,
				"confirmed",
			),
		).pipe(Effect.option);

		if (Option.isNone(fuelTokenToAccount)) {
			ixs.push(createFuelFuelTankAta.instructions);
		}

		const [pilotXpKey] = yield* findUserPointsPda({
			category: "pilotXp",
			playerProfile: context.playerProfile.key,
		});

		const [councilRankXpKey] = yield* findUserPointsPda({
			category: "councilRankXp",
			playerProfile: context.playerProfile.key,
		});

		const [cargoTypeAddress] = yield* findCargoTypePda(
			resourceMintByName("Fuel"),
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const maybeMoveHandlerIx = Match.value(fleetAccount.state).pipe(
			Match.when({ MoveWarp: Match.defined }, () =>
				Fleet.moveWarpHandler(
					programs.sage,
					programs.points,
					context.playerProfile.key,
					fleetAccount.key,
					pilotXpKey,
					context.gameInfo.points.pilotXpCategory.category,
					context.gameInfo.points.pilotXpCategory.modifier,
					councilRankXpKey,
					context.gameInfo.points.councilRankXpCategory.category,
					context.gameInfo.points.councilRankXpCategory.modifier,
					context.gameInfo.gameId,
				),
			),
			Match.when({ MoveSubwarp: Match.defined }, () =>
				Fleet.movementSubwarpHandler(
					programs.sage,
					programs.cargo,
					programs.points,
					context.playerProfile.key,
					fleetAccount.key,
					fleetAccount.data.fuelTank,
					cargoTypeAddress,
					context.gameInfo.cargoStatsDefinitionId,
					createFuelFuelTankAta.address,
					resourceMintByName("Fuel"),
					pilotXpKey,
					context.gameInfo.points.pilotXpCategory.category,
					context.gameInfo.points.pilotXpCategory.modifier,
					councilRankXpKey,
					context.gameInfo.points.councilRankXpCategory.category,
					context.gameInfo.points.councilRankXpCategory.modifier,
					context.gameInfo.gameId,
				),
			),
			Match.orElse(() => null),
		);

		return maybeMoveHandlerIx ? [...ixs, maybeMoveHandlerIx] : [];
	});
