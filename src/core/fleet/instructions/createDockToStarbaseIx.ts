import { Keypair, type PublicKey } from "@solana/web3.js";
import { Fleet, StarbasePlayer } from "@staratlas/sage";
import { Effect, Match, Option } from "effect";
import { resourceNameToMint } from "../../../constants/resources";
import { getCurrentFleetSectorCoordinates } from "../../../utils/getCurrentFleetSector";
import { getCargoPodsByAuthority } from "../../cargo-utils";
import {
	getCouncilRankXpKey,
	getPilotXpKey,
} from "../../points-utils/accounts";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	getFleetAccount,
	getStarbaseAccount,
	getStarbasePlayerAccount,
} from "../../utils/accounts";
import {
	getCargoTypeAddress,
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbaseAddressbyCoordinates,
	getStarbasePlayerAddress,
} from "../../utils/pdas";
import { createIdleToLoadingBayIx } from "./createIdleToLoadingBayIx";

export const createDockToStarbaseIx = (fleetAddress: PublicKey) =>
	Effect.gen(function* () {
		const fleetAccount = yield* getFleetAccount(fleetAddress);

		const gameService = yield* GameService;
		const signer = yield* gameService.signer;

		const sagePlayerProfileAddress = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			fleetAccount.data.ownerProfile,
		);

		const playerFactionAddress = yield* getProfileFactionAddress(
			fleetAccount.data.ownerProfile,
		);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(fleetAccount);

		const starbaseAddress = yield* getStarbaseAddressbyCoordinates(
			fleetAccount.data.gameId,
			fleetCoords,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		const starbasePlayerAddress = yield* getStarbasePlayerAddress(
			starbaseAccount.key,
			sagePlayerProfileAddress,
			starbaseAccount.data.seqId,
		);

		const starbasePlayerAccount = yield* getStarbasePlayerAccount(
			starbasePlayerAddress,
		);

		const ixs = [];

		const programs = yield* SagePrograms;

		const context = yield* getGameContext();

		const gameId = context.game.key;
		const gameState = context.game.data.gameState;

		if (!starbasePlayerAccount) {
			const ix_0 = StarbasePlayer.registerStarbasePlayer(
				programs.sage,
				playerFactionAddress,
				sagePlayerProfileAddress,
				starbaseAddress,
				gameId,
				gameState,
				starbaseAccount.data.seqId,
			);

			ixs.push(ix_0);
		}

		const starbasePlayerPod = yield* getCargoPodsByAuthority(
			starbasePlayerAddress,
		).pipe(Effect.option);

		if (Option.isNone(starbasePlayerPod)) {
			const podSeedBuffer = Keypair.generate().publicKey.toBuffer();
			const podSeeds = Array.from(podSeedBuffer);

			const ix_1 = StarbasePlayer.createCargoPod(
				programs.sage,
				programs.cargo,
				starbasePlayerAddress,
				signer,
				context.playerProfile,
				playerFactionAddress,
				starbaseAddress,
				context.cargoStatsDefinition.key,
				gameId,
				gameState,
				{
					keyIndex: 1,
					podSeeds,
				},
			);

			ixs.push(ix_1);
		}

		const pilotXpKey = yield* getPilotXpKey(context.playerProfile);
		const councilRankXpKey = yield* getCouncilRankXpKey(context.playerProfile);

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Fuel,
			context.cargoStatsDefinition,
		);

		const { address: fuelTankAta } =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Fuel,
				fleetAccount.data.fuelTank,
				true,
			);

		const maybeMoveHandlerIx = Match.value(fleetAccount.state).pipe(
			Match.when({ MoveWarp: {} }, () =>
				Fleet.moveWarpHandler(
					programs.sage,
					programs.points,
					context.playerProfile,
					fleetAddress,
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
					gameId,
				),
			),
			Match.when({ MoveSubwarp: {} }, () =>
				Fleet.movementSubwarpHandler(
					programs.sage,
					programs.cargo,
					programs.points,
					context.playerProfile,
					fleetAddress,
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
					gameId,
				),
			),
			Match.orElse(() => null),
		);

		if (maybeMoveHandlerIx) {
			ixs.push(maybeMoveHandlerIx);
		}

		const dockIx = yield* createIdleToLoadingBayIx({
			profileFaction: playerFactionAddress,
			fleet: fleetAccount.key,
			input: 1,
			playerProfile: fleetAccount.data.ownerProfile,
			starbase: starbaseAccount.key,
			starbasePlayer: starbasePlayerAddress,
		});

		ixs.push(dockIx);

		return ixs;
	});
