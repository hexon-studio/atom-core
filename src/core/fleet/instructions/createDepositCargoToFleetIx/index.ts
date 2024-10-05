import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Effect, pipe } from "effect";
import { isNone } from "effect/Option";
import type { CargoPodKind } from "../../../../types";
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
	getCargoStatsDefinitionAccount,
	getFleetAccount,
	getStarbaseAccount,
} from "../../../utils/accounts";
import {
	getCargoTypeAddress,
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbasePlayerAddress,
} from "../../../utils/pdas";
import { InvalidFleetStateError } from "../../errors";
import { getCurrentFleetStateName } from "../../utils/getCurrentFleetStateName";
import {
	FleetCargoPodFullError,
	GetTokenBalanceError,
	InvalidAmountError,
	InvalidResourceForPodKind,
	StarbaseCargoPodEmptyError,
	StarbaseCargoPodTokenAccountNotFoundError,
} from "../ixs";

export const createDepositCargoToFleetIx = ({
	amount,
	fleetAddress,
	resourceMint,
	cargoPodKind,
}: {
	amount: number;
	fleetAddress: PublicKey;
	resourceMint: PublicKey;
	cargoPodKind: CargoPodKind;
}) =>
	Effect.gen(function* () {
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

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		if (!fleetAccount.state.StarbaseLoadingBay) {
			const fleetStateName = getCurrentFleetStateName(fleetAccount.state);

			return yield* Effect.fail(
				new InvalidFleetStateError({
					state: fleetStateName,
					reason: "Fleet is not in starbase",
				}),
			);
		}

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
		const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;
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

		const gameService = yield* GameService;

		const maybeTokenAccountFrom = yield* pipe(
			gameService.utils.getParsedTokenAccountsByOwner(
				starbasePlayerCargoPodsPubkey,
			),
			Effect.flatMap(
				Effect.findFirst((account) =>
					Effect.succeed(account.mint.toBase58() === resourceMint.toBase58()),
				),
			),
		);

		if (isNone(maybeTokenAccountFrom)) {
			return yield* Effect.fail(
				new StarbaseCargoPodTokenAccountNotFoundError(),
			);
		}

		const tokenAccountFromPubkey = maybeTokenAccountFrom.value.address;

		const tokenAccountToATA =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceMint,
				cargoPodInfo.key,
				true,
			);

		const tokenAccountToPubkey = tokenAccountToATA.address;

		const ix_0 = tokenAccountToATA.instructions;

		const resourceSpaceInCargoPerUnit = new BN(2);

		const amountInCargoUnit = new BN(amount).mul(resourceSpaceInCargoPerUnit);

		const freeSpaceInCargoUnit = cargoPodInfo.loadedAmount.gt(new BN(0))
			? cargoPodInfo.maxCapacity.sub(cargoPodInfo.loadedAmount)
			: cargoPodInfo.maxCapacity;

		const amountToDepositInCargoUnit = BN.min(
			amountInCargoUnit,
			freeSpaceInCargoUnit,
		);

		const amountToDeposit = amountToDepositInCargoUnit.div(
			resourceSpaceInCargoPerUnit,
		);

		if (amountToDeposit.eq(new BN(0))) {
			return yield* Effect.fail(
				new FleetCargoPodFullError({ podKind: cargoPodKind }),
			);
		}

		const solanaService = yield* SolanaService;
		const anchorProvider = yield* solanaService.anchorProvider;

		const starbasePodMintAta = yield* getAssociatedTokenAddress(
			resourceMint,
			starbasePlayerCargoPodsPubkey,
			true,
		);

		const starbasePodMintAtaBalance = yield* Effect.tryPromise({
			try: () =>
				anchorProvider.connection.getTokenAccountBalance(starbasePodMintAta),
			catch: (error) => new GetTokenBalanceError({ error }),
		}).pipe(Effect.map((response) => new BN(response.value.uiAmount ?? 0)));

		const amountToDepositAvailable = BN.min(
			amountToDeposit,
			starbasePodMintAtaBalance,
		);

		if (amountToDepositAvailable.eq(new BN(0))) {
			return yield* Effect.fail(
				new StarbaseCargoPodEmptyError({ resourceMint }),
			);
		}

		const programs = yield* SagePrograms;
		const signer = yield* gameService.signer;

		const context = yield* getGameContext();

		const gameId = context.game.key;
		const gameState = context.game.data.gameState;

		const cargoStatsDefinition = yield* getCargoStatsDefinitionAccount(
			context.game.data.cargo.statsDefinition,
		);

		const cargoType = yield* getCargoTypeAddress(
			resourceMint,
			cargoStatsDefinition,
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
			fleetAddress,
			starbasePlayerCargoPodsPubkey,
			cargoPodInfo.key,
			cargoType,
			cargoStatsDefinition.key,
			tokenAccountFromPubkey,
			tokenAccountToPubkey,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: 1, amount: amountToDepositAvailable },
		);

		return [ix_0, ix_1];
	});
