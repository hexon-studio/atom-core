import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, Option, pipe } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import type { StarbaseInfo } from "~/core/utils/getStarbaseInfo";
import {
	findCargoTypePda,
	isResourceAllowedForCargoPod,
} from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import type { CargoPodKind } from "~/utils/decoders";
import {
	FleetInvalidResourceForPodKindError,
	InvalidAmountError,
} from "../../../../errors";

export const createDepositCargoToFleetIx = ({
	cargoPodPublicKey,
	item,
	fleetAccount,
	starbaseInfo,
}: {
	cargoPodPublicKey: PublicKey;
	starbaseInfo: Omit<StarbaseInfo, "starbaseAccount">;
	item: {
		amount: BN;
		cargoPodKind: CargoPodKind;
		resourceMint: PublicKey;
		starbaseResourceTokenAccount: PublicKey;
	};
	fleetAccount: Fleet;
}) =>
	Effect.gen(function* () {
		const { amount, cargoPodKind, resourceMint, starbaseResourceTokenAccount } =
			item;

		const provider = yield* SolanaService.anchorProvider;

		const ixs: InstructionReturn[] = [];

		const {
			starbasePlayerPubkey,
			starbasePubkey,
			starbasePlayerCargoPodsAccountPubkey,
		} = starbaseInfo;

		if (amount.lten(0)) {
			return yield* Effect.fail(
				new InvalidAmountError({ resourceMint, amount: amount.toString() }),
			);
		}

		const isAllowed = pipe(
			cargoPodKind,
			isResourceAllowedForCargoPod(resourceMint),
		);

		if (!isAllowed) {
			return yield* Effect.fail(
				new FleetInvalidResourceForPodKindError({
					cargoPodKind,
					resourceMint,
				}),
			);
		}

		const context = yield* getGameContext();

		const [profileFactionPubkey] = yield* findProfileFactionPda(
			context.playerProfile.key,
		);

		const targetTokenIx =
			yield* SolanaService.createAssociatedTokenAccountIdempotent(
				resourceMint,
				cargoPodPublicKey,
				true,
			);

		const targetTokenAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, targetTokenIx.address, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(targetTokenAccount)) {
			ixs.push(targetTokenIx.instructions);
		}

		const tokenAccountToPubkey = targetTokenIx.address;

		const [cargoTypeAddress] = yield* findCargoTypePda(
			resourceMint,
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const programs = yield* getSagePrograms();
		const signer = yield* GameService.signer;

		const gameId = context.gameInfo.gameId;
		const gameState = context.gameInfo.gameStateId;

		yield* Effect.log("Creating depositCargoToFleet IX").pipe(
			Effect.annotateLogs({
				fleetAddress: fleetAccount.key.toString(),
				resourceMint: resourceMint.toString(),
				keyIndex: context.keyIndexes.sage,
				amount: amount.toString(),
			}),
		);

		const ix_1 = Fleet.depositCargoToFleet(
			programs.sage,
			programs.cargo,
			signer,
			context.playerProfile.key,
			profileFactionPubkey,
			"funder",
			starbasePubkey,
			starbasePlayerPubkey,
			fleetAccount.key,
			starbasePlayerCargoPodsAccountPubkey,
			cargoPodPublicKey,
			cargoTypeAddress,
			context.gameInfo.cargoStatsDefinitionId,
			starbaseResourceTokenAccount,
			tokenAccountToPubkey,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: context.keyIndexes.sage, amount: new BN(amount) },
		);

		return [...ixs, ix_1];
	});
