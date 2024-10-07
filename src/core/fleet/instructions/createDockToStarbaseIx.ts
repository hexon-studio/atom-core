import { Keypair } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet, StarbasePlayer } from "@staratlas/sage";
import { Effect, Option } from "effect";
import { isNone } from "effect/Option";
import { getCargoPodsByAuthority } from "../../cargo-utils";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	getStarbaseAccount,
	getStarbasePlayerAccount,
} from "../../utils/accounts";
import {
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbaseAddressbyCoordinates,
	getStarbasePlayerAddress,
} from "../../utils/pdas";
import { InvalidFleetStateError } from "../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

export const createDockToStarbaseIx = (fleetAccount: Fleet) =>
	Effect.gen(function* () {
		if (fleetAccount.state.StarbaseLoadingBay) {
			return yield* Effect.fail(
				new InvalidFleetStateError({
					state: "StarbaseLoadingBay",
					reason: "Fleet is already docked to a starbase",
				}),
			);
		}

		if (fleetAccount.state.MineAsteroid) {
			return yield* Effect.fail(
				new InvalidFleetStateError({
					state: "MineAsteroid",
					reason: "Fleet is currently mining on an asteroid",
				}),
			);
		}

		const gameService = yield* GameService;
		const signer = yield* gameService.signer;

		const sagePlayerProfileAddress = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			fleetAccount.data.ownerProfile,
		);

		const playerFactionAddress = yield* getProfileFactionAddress(
			fleetAccount.data.ownerProfile,
		);

		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

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
		).pipe(Effect.option);

		const ixs: InstructionReturn[] = [];

		const programs = yield* SagePrograms;

		const context = yield* getGameContext();

		const gameId = context.game.key;
		const gameState = context.game.data.gameState;

		if (isNone(starbasePlayerAccount)) {
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

		const maybeMoveHandlerIx = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...maybeMoveHandlerIx);

		const dockIx = Fleet.idleToLoadingBay(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			starbaseAddress,
			starbasePlayerAddress,
			context.game.key,
			context.game.data.gameState,
			1,
		);

		ixs.push(dockIx);

		return ixs;
	});
