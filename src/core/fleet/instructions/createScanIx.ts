import { getAccount } from "@solana/spl-token";
import { readAllFromRPC } from "@staratlas/data-source";
import { type Fleet, Sector, SurveyDataUnitTracker } from "@staratlas/sage";
import { Effect, Array as EffectArray, Option } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import { findUserPointsPda } from "~/libs/@staratlas/points";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	fetchSectorAccount,
	findSectorPdaByCoordinates,
} from "~/libs/@staratlas/sage";
import { resourceMintByName } from "~/utils";
import { findAssociatedTokenPda } from "~/utils/findAssociatedTokenPda";
import {
	GetSurveyDataUnitTrackerError,
	GetSurveyDataUnitTrackerNotFoundError,
} from "../../../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

export const createScanIx = ({ fleetAccount }: { fleetAccount: Fleet }) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const programs = yield* getSagePrograms();

		const signer = yield* GameService.signer;

		const [profileFaction] = yield* findProfileFactionPda(
			context.playerProfile.key,
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
			resourceMintByName("SurveyDataUnit"),
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const [foodCargoTypeAddress] = yield* findCargoTypePda(
			resourceMintByName("Food"),
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const sduTokenFrom = yield* findAssociatedTokenPda({
			mint: resourceMintByName("SurveyDataUnit"),
			owner: surveyDataUnitTracker.value.data.data.signer,
		});

		const ixs = [];

		const sectionAccount = yield* fetchSectorAccount(sectorPda).pipe(
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
					context.gameInfo.gameId,
					context.gameInfo.gameStateId,
					sectorCoordinates,
					context.keyIndexes.sage,
				).instructions,
			);
		}

		const maybeMoveHandlerIx = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...maybeMoveHandlerIx);

		const sduTokenToIx =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				resourceMintByName("SurveyDataUnit"),
				fleetAccount.data.cargoHold,
				true,
			);

		const sduTokenToAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, sduTokenToIx.address, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(sduTokenToAccount)) {
			ixs.push(sduTokenToIx.instructions);
		}

		const foodTokenFrom = yield* findAssociatedTokenPda({
			mint: resourceMintByName("Food"),
			owner: fleetAccount.data.cargoHold,
		});

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
				context.gameInfo.cargoStatsDefinitionId,
				sduTokenFrom,
				sduTokenToIx.address,
				foodTokenFrom,
				resourceMintByName("Food"),
				dataRunningXpPda,
				context.gameInfo.points.dataRunningXpCategory.category,
				context.gameInfo.points.dataRunningXpCategory.modifier,
				councilRankXpPda,
				context.gameInfo.points.councilRankXpCategory.category,
				context.gameInfo.points.councilRankXpCategory.modifier,
				context.gameInfo.gameId,
				context.gameInfo.gameStateId,
				{ keyIndex: context.keyIndexes.sage },
			),
		];
	});
