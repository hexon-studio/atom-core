import { Keypair } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet, StarbasePlayer } from "@staratlas/sage";
import { Effect, Option } from "effect";
import { isNone } from "effect/Option";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	findSagePlayerProfilePda,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
	getStarbaseAccount,
	getStarbasePlayerAccount,
} from "~/libs/@staratlas/sage";
import { getCargoPodsByAuthority } from "~/libs/@staratlas/sage/utils/getCargoPodsByAuthority";
import { InvalidFleetStateError } from "../../../errors";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";

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

		const signer = yield* GameService.signer;

		const context = yield* getGameContext();

		const [sagePlayerProfilePda, playerFactionPda, fleetCoords] =
			yield* Effect.all([
				findSagePlayerProfilePda(
					fleetAccount.data.gameId,
					context.playerProfile.key,
				),
				findProfileFactionPda(context.playerProfile.key),
				getCurrentFleetSectorCoordinates(fleetAccount.state),
			]);

		const [sagePlayerProfileAddress] = sagePlayerProfilePda;

		const [playerFactionAddress] = playerFactionPda;

		const [starbaseAddress] = yield* findStarbasePdaByCoordinates(
			fleetAccount.data.gameId,
			fleetCoords,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		const [starbasePlayerAddress] = yield* findStarbasePlayerPda(
			starbaseAccount.key,
			sagePlayerProfileAddress,
			starbaseAccount.data.seqId,
		);

		const starbasePlayerAccount = yield* getStarbasePlayerAccount(
			starbasePlayerAddress,
		).pipe(Effect.option);

		const ixs: InstructionReturn[] = [];

		const programs = yield* getSagePrograms();

		const gameId = context.gameInfo.gameId;
		const gameState = context.gameInfo.gameStateId;

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
				context.playerProfile.key,
				playerFactionAddress,
				starbaseAddress,
				context.gameInfo.cargoStatsDefinitionId,
				gameId,
				gameState,
				{
					keyIndex: context.keyIndexes.sage,
					podSeeds,
				},
			);

			ixs.push(ix_1);
		}

		//const maybeMoveHandlerIx = yield* createMovementHandlerIx(fleetAccount);

		// ixs.push(...maybeMoveHandlerIx);

		yield* Effect.log("Creating idleToLoadingBay IX");

		const dockIx = Fleet.idleToLoadingBay(
			programs.sage,
			signer,
			context.playerProfile.key,
			playerFactionAddress,
			fleetAccount.key,
			starbaseAddress,
			starbasePlayerAddress,
			context.gameInfo.gameId,
			context.gameInfo.gameStateId,
			context.keyIndexes.sage,
		);

		return [...ixs, dockIx];
	});
