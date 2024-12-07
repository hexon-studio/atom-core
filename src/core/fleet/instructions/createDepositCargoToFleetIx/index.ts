import {
	Fleet,
	SAGE_CARGO_STAT_VALUE_INDEX,
	getCargoSpaceUsedByTokenAmount,
} from "@staratlas/sage";
import BN from "bn.js";
import { Effect, Array as EffectArray, Option, pipe } from "effect";
import type { LoadResourceInput } from "../../../../decoders";
import { getAssociatedTokenAddress } from "../../../../utils/getAssociatedTokenAddress";
import { isResourceAllowedForCargoPod } from "../../../../utils/resources/isResourceAllowedForCargoPod";
import {
	getCargoPodsByAuthority,
	getFleetCargoPodInfoByType,
} from "../../../cargo-utils";
import { SagePrograms } from "../../../programs";
import { GameService } from "../../../services/GameService";
import { getGameContext } from "../../../services/GameService/utils";
import { SolanaService } from "../../../services/SolanaService";
import {
	getCargoTypeAccount,
	getStarbaseAccount,
} from "../../../utils/accounts";
import {
	getCargoTypeAddress,
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbaseAddressbyCoordinates,
	getStarbasePlayerAddress,
} from "../../../utils/pdas";
import {
	InvalidAmountError,
	InvalidResourceForPodKindError,
} from "../../errors";
import { getCurrentFleetSectorCoordinates } from "../../utils/getCurrentFleetSectorCoordinates";
import { computeDepositAmount } from "./computeDepositAmout";

export const createDepositCargoToFleetIx = ({
	item,
	fleetAccount,
}: {
	item: LoadResourceInput;
	fleetAccount: Fleet;
}) =>
	Effect.gen(function* () {
		const { amount, cargoPodKind, mode, resourceMint } = item;

		if (amount <= 0) {
			return yield* Effect.fail(
				new InvalidAmountError({ resourceMint, amount }),
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

		const cargoPodInfo = yield* getFleetCargoPodInfoByType({
			fleetAccount,
			type: cargoPodKind,
		});

		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			playerProfilePubkey,
		);

		const profileFactionPubkey =
			yield* getProfileFactionAddress(playerProfilePubkey);

		// Starbase where the fleet is located
		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);
		const starbasePubkey = yield* getStarbaseAddressbyCoordinates(
			context.gameInfo.game.key,
			fleetCoords,
		);
		const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

		// PDA Starbase - Player
		const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
			starbasePubkey,
			sagePlayerProfilePubkey,
			starbaseAccount.data.seqId,
		);

		// This PDA account is the owner of all player resource token accounts
		// in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
		const starbasePlayerCargoPodsAccount =
			yield* getCargoPodsByAuthority(starbasePlayerPubkey);

		const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

		const starbaseResourceTokenAccount = yield* getAssociatedTokenAddress(
			resourceMint,
			starbasePlayerCargoPodsPubkey,
			true,
		);

		const provider = yield* SolanaService.pipe(
			Effect.flatMap((service) => service.anchorProvider),
		);

		const starbaseResourceAmountInTokens = yield* Effect.tryPromise(() =>
			provider.connection.getTokenAccountBalance(
				starbaseResourceTokenAccount,
				"confirmed",
			),
		).pipe(
			Effect.map((data) =>
				data.value.uiAmount ? new BN(data.value.uiAmount) : new BN(0),
			),
			Effect.orElseSucceed(() => new BN(0)),
		);

		const targetTokenAccount =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceMint,
				cargoPodInfo.cargoPod.key,
				true,
			);

		const tokenAccountToPubkey = targetTokenAccount.address;

		const ix_0 = targetTokenAccount.instructions;

		const resourceAmountInFleetInCargoUnits = EffectArray.findFirst(
			cargoPodInfo.resources,
			(resource) => resource.mint.equals(resourceMint),
		).pipe(
			Option.map((resource) => resource.amountInCargoUnits),
			Option.getOrElse(() => new BN(0)),
		);

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const cargoTypeAccount = yield* getCargoTypeAccount(cargoTypeAddress);

		const resourceSpaceMultiplier =
			cargoTypeAccount.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(1);

		const fleetMaxCapacityInCargoUnits = cargoPodInfo.maxCapacityInCargoUnits;

		const amountInCargoUnits = getCargoSpaceUsedByTokenAmount(
			cargoTypeAccount,
			new BN(amount),
		);

		const finalAmountToDepositInCargoUnits = yield* computeDepositAmount({
			cargoPodKind,
			resourceMint,
			starbaseAddress: starbasePlayerCargoPodsPubkey,
		})({
			mode,
			resourceFleetMaxCap: fleetMaxCapacityInCargoUnits,
			resourceAmountInFleet: resourceAmountInFleetInCargoUnits,
			resourceAmountInStarbase: getCargoSpaceUsedByTokenAmount(
				cargoTypeAccount,
				starbaseResourceAmountInTokens,
			),
			totalResourcesAmountInFleet:
				cargoPodInfo.totalResourcesAmountInCargoUnits,
			value: amountInCargoUnits,
		});

		const finalAmountToDeposit = finalAmountToDepositInCargoUnits.div(
			resourceSpaceMultiplier,
		);

		yield* Effect.log(`Load cargo in ${cargoPodKind}`).pipe(
			Effect.annotateLogs({
				cargoPodKind,
				resourceFleetMaxCap: fleetMaxCapacityInCargoUnits.toString(),
				mode,
				totalResourcesAmountInFleet:
					cargoPodInfo.totalResourcesAmountInCargoUnits.toString(),
				resourceAmountInFleet: resourceAmountInFleetInCargoUnits.toString(),
				resourceAmountInStarbase: starbaseResourceAmountInTokens.toString(),
				amount: amount.toString(),
				amountInCargoUnits: amountInCargoUnits.toString(),
				finalAmountToDepositInCargoUnits:
					finalAmountToDepositInCargoUnits.toString(),
				finalAmountToDeposit: finalAmountToDeposit.toString(),
			}),
		);

		if (finalAmountToDeposit.lten(0)) {
			yield* Effect.log(
				`Skip deposit of ${resourceMint.toString()}, computed amount is: ${finalAmountToDeposit.toString()}`,
			);

			// Skip deposit if less or equal than 0
			return [];
		}

		const programs = yield* SagePrograms;
		const signer = yield* gameService.signer;

		const gameId = context.gameInfo.game.key;
		const gameState = context.gameInfo.game.data.gameState;

		yield* Effect.log("Creating depositCargoToFleet IX").pipe(
			Effect.annotateLogs({
				fleetAddress: fleetAccount.key.toString(),
				resourceMint: resourceMint.toString(),
				keyIndex: context.keyIndexes.sage,
				amount: finalAmountToDeposit.toString(),
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
			starbasePlayerCargoPodsPubkey,
			cargoPodInfo.cargoPod.key,
			cargoTypeAccount.key,
			context.gameInfo.cargoStatsDefinition.key,
			starbaseResourceTokenAccount,
			tokenAccountToPubkey,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: context.keyIndexes.sage, amount: finalAmountToDeposit },
		);

		return [ix_0, ix_1];
	});
