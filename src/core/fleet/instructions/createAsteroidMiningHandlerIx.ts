import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";
import { Effect, Match, Option } from "effect";
import { SolanaService } from "~/core/services/SolanaService";
import { findCargoTypePda } from "~/libs/@staratlas/cargo";
import {
	findMineItemPda,
	findResourcePda,
	findStarbasePdaByCoordinates,
} from "~/libs/@staratlas/sage";
import { resourceMintByName } from "~/utils";
import { findAssociatedTokenPda } from "../../../utils/findAssociatedTokenPda";
import { getSagePrograms } from "../../programs";
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

		const provider = yield* SolanaService.anchorProvider;

		const ixs: InstructionReturn[] = [];

		const { address: foodCargoHoldAta, instructions: foodIx } =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				resourceMintByName("Food"),
				fleetAccount.data.cargoHold,
				true,
			);

		const foodTokenToAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, foodCargoHoldAta, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(foodTokenToAccount)) {
			ixs.push(foodIx);
		}

		const createAmmoBankAta =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				resourceMintByName("Ammunition"),
				fleetAccount.data.ammoBank,
				true,
			);

		const ammoTokenToAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, createAmmoBankAta.address, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(ammoTokenToAccount)) {
			ixs.push(createAmmoBankAta.instructions);
		}

		const { address: resourceCargoHoldAta, instructions: resourceIx } =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				resourceMint,
				fleetAccount.data.cargoHold,
				true,
			);

		const resourceTokenToAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, resourceCargoHoldAta, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(resourceTokenToAccount)) {
			ixs.push(resourceIx);
		}

		const [foodCargoTypeAddress] = yield* findCargoTypePda(
			resourceMintByName("Food"),
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const [ammoCargoTypeAddress] = yield* findCargoTypePda(
			resourceMintByName("Ammunition"),
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const [resourceCargoTypeAddress] = yield* findCargoTypePda(
			resourceMint,
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
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

		const resourceTokenFromAta = yield* findAssociatedTokenPda({
			mint: resourceMint,
			owner: mineItemKey,
		});

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
					context.gameInfo.cargoStatsDefinitionId,
					context.gameInfo.gameStateId,
					context.gameInfo.gameId,
					foodCargoHoldAta,
					createAmmoBankAta.address,
					resourceTokenFromAta,
					resourceCargoHoldAta,
					resourceMintByName("Food"),
					resourceMintByName("Ammunition"),
				),
			),
			Match.orElse(() => null),
		);

		return maybeAsteroidMiningHandlerIx
			? [...ixs, maybeAsteroidMiningHandlerIx]
			: [];
	});
