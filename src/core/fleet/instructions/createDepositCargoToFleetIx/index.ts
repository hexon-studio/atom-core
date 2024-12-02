import type { PublicKey } from "@solana/web3.js";
import { Fleet, SAGE_CARGO_STAT_VALUE_INDEX } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, pipe } from "effect";
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
	getFleetAccount,
	getStarbaseAccount,
} from "../../../utils/accounts";
import {
	getCargoTypeAddress,
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbaseAddressbyCoordinates,
	getStarbasePlayerAddress,
} from "../../../utils/pdas";
import { InvalidAmountError, InvalidResourceForPodKind } from "../../errors";
import { getCurrentFleetSectorCoordinates } from "../../utils/getCurrentFleetSectorCoordinates";
import { computeDepositAmount } from "./computeDepositAmout";

export const createDepositCargoToFleetIx = ({
	item,
	fleetAddress,
}: {
	item: LoadResourceInput;
	fleetAddress: PublicKey;
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
			return yield* Effect.fail(new InvalidResourceForPodKind());
		}

		const gameService = yield* GameService;
		const context = yield* getGameContext();

		const fleetAccount = yield* getFleetAccount(fleetAddress);

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
				cargoPodInfo.key,
				true,
			);

		const tokenAccountToPubkey = targetTokenAccount.address;

		const ix_0 = targetTokenAccount.instructions;

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const cargoType = yield* getCargoTypeAccount(cargoTypeAddress);

		const resourceSpaceMultiplier =
			cargoType.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(0);

		const fleetMaxCapacityInTokens = cargoPodInfo.maxCapacity.div(
			resourceSpaceMultiplier,
		);

		const loadedAmountInTokens = cargoPodInfo.loadedAmountInCargoUnits.div(
			resourceSpaceMultiplier,
		);

		const finalAmountToDeposit = yield* computeDepositAmount({
			cargoPodKind,
			resourceMint,
			starbaseAddress: starbasePlayerCargoPodsPubkey,
		})({
			resourceFleetMaxCap: fleetMaxCapacityInTokens,
			mode,
			resourceAmountInFleet: loadedAmountInTokens,
			resourceAmountInStarbase: starbaseResourceAmountInTokens,
			value: new BN(amount),
		});

		yield* Effect.log("Load cargo amount").pipe(
			Effect.annotateLogs({
				resourceFleetMaxCap: fleetMaxCapacityInTokens.toString(),
				mode,
				resourceAmountInFleet: loadedAmountInTokens.toString(),
				resourceAmountInStarbase: starbaseResourceAmountInTokens.toString(),
				amount,
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

		const ix_1 = Fleet.depositCargoToFleet(
			programs.sage,
			programs.cargo,
			signer,
			playerProfilePubkey,
			profileFactionPubkey,
			"funder",
			starbasePubkey,
			starbasePlayerPubkey,
			fleetAddress,
			starbasePlayerCargoPodsPubkey,
			cargoPodInfo.key,
			cargoType.key,
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
