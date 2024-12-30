import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, pipe } from "effect";
import { getCargoTypeAddress } from "~/libs/@staratlas/cargo";
import { getProfileFactionAddress } from "~/libs/@staratlas/profile-faction";
import type { CargoPodKind } from "../../../../decoders";
import { isResourceAllowedForCargoPod } from "../../../../utils/resources/isResourceAllowedForCargoPod";
import type { CargoPodEnhanced } from "../../../cargo-utils";
import { getSagePrograms } from "../../../programs";
import { GameService } from "../../../services/GameService";
import { getGameContext } from "../../../services/GameService/utils";
import type { StarbaseInfo } from "../../../utils/getStarbaseInfo";
import {
	InvalidAmountError,
	InvalidResourceForPodKindError,
} from "../../errors";

export const createDepositCargoToFleetIx = ({
	item,
	fleetAccount,
	starbaseInfo,
}: {
	starbaseInfo: Omit<StarbaseInfo, "starbaseAccount">;
	item: {
		amount: BN;
		cargoPodInfo: CargoPodEnhanced;
		cargoPodKind: CargoPodKind;
		resourceMint: PublicKey;
		starbaseResourceTokenAccount: PublicKey;
	};
	fleetAccount: Fleet;
}) =>
	Effect.gen(function* () {
		const {
			amount,
			cargoPodKind,
			resourceMint,
			cargoPodInfo,
			starbaseResourceTokenAccount,
		} = item;

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

		const gameService = yield* GameService;
		const context = yield* getGameContext();

		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const profileFactionPubkey =
			yield* getProfileFactionAddress(playerProfilePubkey);

		const targetTokenAccount =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceMint,
				cargoPodInfo.cargoPod.key,
				true,
			);

		const tokenAccountToPubkey = targetTokenAccount.address;

		const ix_0 = targetTokenAccount.instructions;

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const programs = yield* getSagePrograms();
		const signer = yield* gameService.signer;

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
			cargoPodInfo.cargoPod.key,
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
