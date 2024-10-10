import { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";
import { Effect, Match } from "effect";
import { resourceNameToMint } from "../../../constants/resources";
import { getAssociatedTokenAddress } from "../../../utils/getAssociatedTokenAddress";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	getCargoTypeAddress,
	getMineItemAddress,
	getResourceAddress,
	getStarbaseAddressbyCoordinates,
} from "../../utils/pdas";
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
		const programs = yield* SagePrograms;
		const gameService = yield* GameService;
		const context = yield* getGameContext();

		const ixs: InstructionReturn[] = [];

		const { address: foodCargoHoldAta, instructions: foodIxs } =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Food,
				fleetAccount.data.cargoHold,
				true,
			);

		ixs.push(foodIxs);

		const { address: ammoAmmoBankAta, instructions: ammoIxs } =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Ammunition,
				fleetAccount.data.ammoBank,
				true,
			);

		ixs.push(ammoIxs);

		const { address: resourceCargoHoldAta, instructions: resourceIxs } =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceMint,
				fleetAccount.data.cargoHold,
				true,
			);

		ixs.push(resourceIxs);

		const foodCargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Food,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const ammoCargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Ammunition,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const resourceCargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			new PublicKey(context.gameInfo.cargoStatsDefinition.key),
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const fleetCoordinates = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const starbaseAddress = yield* getStarbaseAddressbyCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const mineItemKey = yield* getMineItemAddress(
			fleetAccount.data.gameId,
			resourceMint,
		);

		const resourceKey = yield* getResourceAddress(mineItemKey, planetAddress);

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
