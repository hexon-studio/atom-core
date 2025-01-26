import { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";
import { Effect, Match } from "effect";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import {
	findMineItemPda,
	findResourcePda,
	findStarbasePdaByCoordinates,
} from "~/libs/@staratlas/sage";
import { resourceNameToMint } from "../../../constants/resources";
import { getAssociatedTokenAddress } from "../../../utils/getAssociatedTokenAddress";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";

type Param = {
	fleetAccount: Fleet;
	resourceMint: PublicKey;
	planetAddress: PublicKey;
};

export const createAsteroidMiningHandlerIx = ({
	fleetAccount,
	resourceMint,
	planetAddress,
}: Param) =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();
		const context = yield* getGameContext();

		const ixs: InstructionReturn[] = [];

		const { address: foodCargoHoldAta, instructions: foodIxs } =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Food,
				fleetAccount.data.cargoHold,
				true,
			);

		ixs.push(foodIxs);

		const { address: ammoAmmoBankAta, instructions: ammoIxs } =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Ammunition,
				fleetAccount.data.ammoBank,
				true,
			);

		ixs.push(ammoIxs);

		const { address: resourceCargoHoldAta, instructions: resourceIxs } =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				resourceMint,
				fleetAccount.data.cargoHold,
				true,
			);

		ixs.push(resourceIxs);

		const [foodCargoTypeAddress] = yield* findCargoTypePda(
			resourceNameToMint.Food,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const [ammoCargoTypeAddress] = yield* findCargoTypePda(
			resourceNameToMint.Ammunition,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const [resourceCargoTypeAddress] = yield* findCargoTypePda(
			resourceMint,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const fleetCoordinates = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const [starbaseAddress] = yield* findStarbasePdaByCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const [mineItemKey] = yield* findMineItemPda(
			fleetAccount.data.gameId,
			resourceMint,
		);

		const [resourceKey] = yield* findResourcePda({
			mint: mineItemKey,
			planet: planetAddress,
		});

		const resourceTokenFromAta = yield* getAssociatedTokenAddress(
			resourceMint,
			mineItemKey,
			true,
		);

		const maybeAsteroidMiningHandlerIx = Match.value(fleetAccount.state).pipe(
			Match.when({ MineAsteroid: Match.defined }, () =>
				Fleet.asteroidMiningHandler(
					programs.sage,
					programs.cargo,
					fleetAccount.key,
					starbaseAddress,
					mineItemKey,
					resourceKey,
					planetAddress,
					fleetAccount.data.cargoHold,
					fleetAccount.data.ammoBank,
					foodCargoTypeAddress,
					ammoCargoTypeAddress,
					resourceCargoTypeAddress,
					context.gameInfo.cargoStatsDefinition.key,
					context.gameInfo.game.data.gameState,
					context.gameInfo.game.key,
					foodCargoHoldAta,
					ammoAmmoBankAta,
					resourceTokenFromAta,
					resourceCargoHoldAta,
					resourceNameToMint.Food,
					resourceNameToMint.Ammunition,
				),
			),
			Match.orElse(() => null),
		);

		return maybeAsteroidMiningHandlerIx
			? [...ixs, maybeAsteroidMiningHandlerIx]
			: [];
	});
