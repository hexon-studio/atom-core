import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, pipe } from "effect";
import type { CargoPodKind } from "../../../../decoders";
import { isResourceAllowedForCargoPod } from "../../../../utils/resources/isResourceAllowedForCargoPod";
import type { CargoPodEnhanced } from "../../../cargo-utils";
import { SagePrograms } from "../../../programs";
import { GameService } from "../../../services/GameService";
import { getGameContext } from "../../../services/GameService/utils";
import type { StarbaseInfo } from "../../../utils/getStarbaseInfo";
import {
	getCargoTypeAddress,
	getProfileFactionAddress,
} from "../../../utils/pdas";
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

		// This PDA account is the owner of all player resource token accounts
		// in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
		// const starbasePlayerCargoPodsAccount =
		// 	yield* getCargoPodsByAuthority(starbasePlayerPubkey);

		//const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

		// const starbaseResourceTokenAccount = yield* getAssociatedTokenAddress(
		// 	resourceMint,
		// 	starbasePlayerCargoPodsPubkey,
		// 	true,
		// );

		// const starbaseResourceAmountInTokens =
		// 	yield* getAssociatedTokenAccountBalance(starbaseResourceTokenAccount);

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

		// const resourceAmountInFleetInCargoUnits = Record.get(
		// 	cargoPodInfo.resources,
		// 	resourceMint.toString(),
		// ).pipe(
		// 	Option.map((resource) => resource.amountInCargoUnits),
		// 	Option.getOrElse(() => new BN(0)),
		// );

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		// const cargoTypeAccount = yield* getCargoTypeAccount(cargoTypeAddress);

		// const resourceSpaceMultiplier =
		// 	cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(1);

		// const fleetMaxCapacityInCargoUnits = cargoPodInfo.maxCapacityInCargoUnits;

		// const amountInCargoUnits = getCargoSpaceUsedByTokenAmount(
		// 	cargoTypeAccount,
		// 	new BN(amount),
		// );

		// const finalAmountToDepositInCargoUnits = yield* computeDepositAmount({
		// 	cargoPodKind,
		// 	resourceMint,
		// 	starbaseAddress: starbasePlayerCargoPodsPubkey,
		// })({
		// 	mode,
		// 	resourceFleetMaxCap: fleetMaxCapacityInCargoUnits,
		// 	resourceAmountInFleet: resourceAmountInFleetInCargoUnits,
		// 	resourceAmountInStarbase: getCargoSpaceUsedByTokenAmount(
		// 		cargoTypeAccount,
		// 		starbaseResourceAmountInTokens,
		// 	),
		// 	totalResourcesAmountInFleet:
		// 		cargoPodInfo.totalResourcesAmountInCargoUnits,
		// 	value: amountInCargoUnits,
		// });

		// yield* Effect.log(`Load cargo in ${cargoPodKind}`).pipe(
		// 	Effect.annotateLogs({
		// 		cargoPodKind,
		// 		resourceFleetMaxCap: fleetMaxCapacityInCargoUnits.toString(),
		// 		mode,
		// 		totalResourcesAmountInFleet:
		// 			cargoPodInfo.totalResourcesAmountInCargoUnits.toString(),
		// 		resourceAmountInFleet: resourceAmountInFleetInCargoUnits.toString(),
		// 		resourceAmountInStarbase: starbaseResourceAmountInTokens.toString(),
		// 		amount: amount.toString(),
		// 		amountInCargoUnits: amountInCargoUnits.toString(),
		// 		finalAmountToDepositInCargoUnits:
		// 			finalAmountToDepositInCargoUnits.toString(),
		// 		finalAmountToDeposit: finalAmountToDeposit.toString(),
		// 	}),
		// );

		// if (finalAmountToDeposit.lten(0)) {
		// 	yield* Effect.log(
		// 		`Skip deposit of ${resourceMint.toString()}, computed amount is: ${finalAmountToDeposit.toString()}`,
		// 	);

		// 	// Skip deposit if less or equal than 0
		// 	return [];
		// }

		const programs = yield* SagePrograms;
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
