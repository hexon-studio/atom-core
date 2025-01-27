import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, pipe } from "effect";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import type { StarbaseInfo } from "~/core/utils/getStarbaseInfo";
import type { CargoPodKind } from "~/decoders";
import {
	findCargoTypePda,
	isResourceAllowedForCargoPod,
} from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	InvalidAmountError,
	InvalidResourceForPodKindError,
} from "../../errors";

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
				new InvalidResourceForPodKindError({
					cargoPodKind,
					resourceMint,
				}),
			);
		}

		const context = yield* getGameContext();

		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const [profileFactionPubkey] =
			yield* findProfileFactionPda(playerProfilePubkey);

		const targetTokenAccount =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				resourceMint,
				cargoPodPublicKey,
				true,
			);

		const tokenAccountToPubkey = targetTokenAccount.address;

		const ix_0 = targetTokenAccount.instructions;

		const [cargoTypeAddress] = yield* findCargoTypePda(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const programs = yield* getSagePrograms();
		const signer = yield* GameService.signer;

		const gameId = context.gameInfo.game.key;
		const gameState = context.gameInfo.game.data.gameState;

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
			playerProfilePubkey,
			profileFactionPubkey,
			"funder",
			starbasePubkey,
			starbasePlayerPubkey,
			fleetAccount.key,
			starbasePlayerCargoPodsAccountPubkey,
			cargoPodPublicKey,
			cargoTypeAddress,
			context.gameInfo.cargoStatsDefinition.key,
			starbaseResourceTokenAccount,
			tokenAccountToPubkey,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: context.keyIndexes.sage, amount: new BN(amount) },
		);

		return [ix_0, ix_1];
	});
