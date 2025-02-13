import { getAccount } from "@solana/spl-token";
import { readAllFromRPC } from "@staratlas/data-source";
import { type Fleet, Sector, SurveyDataUnitTracker } from "@staratlas/sage";
import { Effect, Array as EffectArray, Option } from "effect";
import { resourceNameToMint } from "~/constants/resources";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import { findUserPointsPda } from "~/libs/@staratlas/points";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	findSectorPdaByCoordinates,
	getSectorAccount,
} from "~/libs/@staratlas/sage";
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";
import {
	GetSurveyDataUnitTrackerError,
	GetSurveyDataUnitTrackerNotFoundError,
} from "../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

export const createScanIx = ({ fleetAccount }: { fleetAccount: Fleet }) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const programs = yield* getSagePrograms();

		const signer = yield* GameService.signer;

		const [profileFaction] = yield* findProfileFactionPda(
			fleetAccount.data.ownerProfile,
		);

		const sectorCoordinates = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const [sectorPda] = yield* findSectorPdaByCoordinates(sectorCoordinates);

		const provider = yield* SolanaService.anchorProvider;

		const surveyDataUnitTrackers = yield* Effect.tryPromise({
			try: () =>
				readAllFromRPC(
					provider.connection,
					programs.sage,
					SurveyDataUnitTracker,
					"confirmed",
				),
			catch: (error) => new GetSurveyDataUnitTrackerError({ error }),
		});

		const surveyDataUnitTracker = EffectArray.head(surveyDataUnitTrackers);

		if (
			Option.isNone(surveyDataUnitTracker) ||
			surveyDataUnitTracker.value.type !== "ok"
		) {
			return yield* new GetSurveyDataUnitTrackerNotFoundError();
		}

		const [sduCargoTypeAddress] = yield* findCargoTypePda(
			resourceNameToMint.SurveyDataUnit,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const [foodCargoTypeAddress] = yield* findCargoTypePda(
			resourceNameToMint.Food,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const sduTokenFrom = yield* findAssociatedTokenPda(
			resourceNameToMint.SurveyDataUnit,
			surveyDataUnitTracker.value.data.data.signer,
			true,
		);

		const ixs = [];

		const sectionAccount = yield* getSectorAccount(sectorPda).pipe(
			Effect.option,
		);

		if (Option.isNone(sectionAccount)) {
			ixs.push(
				Sector.discoverSector(
					programs.sage,
					signer,
					context.playerProfile.key,
					profileFaction,
					fleetAccount.key,
					context.gameInfo.game.key,
					context.gameInfo.game.data.gameState,
					sectorCoordinates,
					context.keyIndexes.sage,
				).instructions,
			);
		}

		const maybeMoveHandlerIx = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...maybeMoveHandlerIx);

		const sduTokenToIx =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.SurveyDataUnit,
				fleetAccount.data.cargoHold,
				true,
			);

		const sduTokenToAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, sduTokenToIx.address, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(sduTokenToAccount)) {
			ixs.push(sduTokenToIx.instructions);
		}

		const foodTokenFrom = yield* findAssociatedTokenPda(
			resourceNameToMint.Food,
			fleetAccount.data.cargoHold,
			true,
		);

		const [dataRunningXpPda] = yield* findUserPointsPda({
			category: "dataRunningXp",
			playerProfile: context.playerProfile.key,
		});

		const [councilRankXpPda] = yield* findUserPointsPda({
			category: "councilRankXp",
			playerProfile: context.playerProfile.key,
		});

		return [
			...ixs,
			SurveyDataUnitTracker.scanForSurveyDataUnits(
				programs.sage,
				programs.cargo,
				programs.points,
				signer,
				context.playerProfile.key,
				profileFaction,
				fleetAccount.key,
				sectorPda,
				surveyDataUnitTracker.value.key,
				fleetAccount.data.cargoHold,
				sduCargoTypeAddress,
				foodCargoTypeAddress,
				context.gameInfo.cargoStatsDefinition.key,
				sduTokenFrom,
				sduTokenToIx.address,
				foodTokenFrom,
				resourceNameToMint.Food,
				dataRunningXpPda,
				context.gameInfo.game.data.points.dataRunningXpCategory.category,
				context.gameInfo.game.data.points.dataRunningXpCategory.modifier,
				councilRankXpPda,
				context.gameInfo.game.data.points.councilRankXpCategory.category,
				context.gameInfo.game.data.points.councilRankXpCategory.modifier,
				context.gameInfo.game.key,
				context.gameInfo.game.data.gameState,
				{ keyIndex: context.keyIndexes.sage },
			),
		];
	});
