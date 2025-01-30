import { getAccount } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import { Effect, Match, Option } from "effect";
import { SolanaService } from "~/core/services/SolanaService";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import { findUserPointsPda } from "~/libs/@staratlas/points";
import { resourceNameToMint } from "../../../constants/resources";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

export const createMovementHandlerIx = (fleetAccount: Fleet) =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();
		const context = yield* getGameContext();

		const provider = yield* SolanaService.anchorProvider;

		const ixs = [];

		const createFuelFuelTankAta =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Fuel,
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
			resourceNameToMint.Fuel,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const maybeMoveHandlerIx = Match.value(fleetAccount.state).pipe(
			Match.when({ MoveWarp: Match.defined }, () =>
				Fleet.moveWarpHandler(
					programs.sage,
					programs.points,
					context.playerProfile.key,
					fleetAccount.key,
					pilotXpKey,
					context.gameInfo.game.data.points.pilotXpCategory.category,
					context.gameInfo.game.data.points.pilotXpCategory.modifier,
					councilRankXpKey,
					context.gameInfo.game.data.points.councilRankXpCategory.category,
					context.gameInfo.game.data.points.councilRankXpCategory.modifier,
					context.gameInfo.game.key,
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
					context.gameInfo.cargoStatsDefinition.key,
					createFuelFuelTankAta.address,
					resourceNameToMint.Fuel,
					pilotXpKey,
					context.gameInfo.game.data.points.pilotXpCategory.category,
					context.gameInfo.game.data.points.pilotXpCategory.modifier,
					councilRankXpKey,
					context.gameInfo.game.data.points.councilRankXpCategory.category,
					context.gameInfo.game.data.points.councilRankXpCategory.modifier,
					context.gameInfo.game.key,
				),
			),
			Match.orElse(() => null),
		);

		return maybeMoveHandlerIx ? [...ixs, maybeMoveHandlerIx] : [];
	});
