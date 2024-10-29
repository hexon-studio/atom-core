import type { PublicKey } from "@solana/web3.js";
import {
	Fleet,
	SAGE_CARGO_STAT_VALUE_INDEX,
	getCargoSpaceUsedByTokenAmount,
} from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, pipe } from "effect";
import { isSome } from "effect/Option";
import type { CargoPodKind } from "../../../../types";
import { getAssociatedTokenAddress } from "../../../../utils/getAssociatedTokenAddress";
import { isResourceAllowedForCargoPod } from "../../../../utils/resources/isResourceAllowedForCargoPod";
import { getFleetCargoPodInfoByType } from "../../../cargo-utils";
import { SagePrograms } from "../../../programs";
import { GameService } from "../../../services/GameService";
import { getGameContext } from "../../../services/GameService/utils";
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
import { InvalidAmountError, InvalidResourceForPodKind } from "../../errors";
import { getCurrentFleetSectorCoordinates } from "../../utils/getCurrentFleetSectorCoordinates";
import { getCargoPodsByAuthority } from "./../../../cargo-utils";

export class FleetCargoPodTokenAccountNotFoundError extends Data.TaggedError(
	"FleetCargoPodTokenAccountNotFoundError",
) {}

export const createWithdrawCargoFromFleetIx = ({
	amount,
	fleetAccount,
	resourceMint,
	cargoPodKind,
}: {
	amount: "full" | number;
	fleetAccount: Fleet;
	resourceMint: PublicKey;
	cargoPodKind: CargoPodKind;
}) =>
	Effect.gen(function* () {
		if (amount !== "full" && amount <= 0) {
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

		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			playerProfilePubkey,
		);

		const profileFactionPubkey =
			yield* getProfileFactionAddress(playerProfilePubkey);

		const cargoPodInfo = yield* getFleetCargoPodInfoByType({
			fleetAccount,
			type: cargoPodKind,
		});

		const cargoPodTokenAccount = yield* getAssociatedTokenAddress(
			resourceMint,
			cargoPodInfo.key,
			true,
		);

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

		const {
			address: starbasePlayerResourceMintAta,
			instructions: createStarbasePlayerResourceMintAtaIx,
		} = yield* gameService.utils.createAssociatedTokenAccountIdempotent(
			resourceMint,
			starbasePlayerCargoPodsPubkey,
			true,
		);

		const maybeTokenAccountFrom = yield* pipe(
			gameService.utils.getParsedTokenAccountsByOwner(cargoPodInfo.key),
			Effect.flatMap(
				Effect.findFirst((account) =>
					Effect.succeed(account.mint.toBase58() === resourceMint.toBase58()),
				),
			),
		);

		const cargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const cargoType = yield* getCargoTypeAccount(cargoTypeAddress);

		const amoutInCargoSpace =
			amount === "full"
				? cargoPodInfo.maxCapacity
				: getCargoSpaceUsedByTokenAmount(cargoType, new BN(amount));

		const resourceSpaceMultiplier =
			cargoType.stats[SAGE_CARGO_STAT_VALUE_INDEX] ?? new BN(0);

		const amoutInTokens = amoutInCargoSpace.div(resourceSpaceMultiplier);

		const maxAmountToWithdraw = isSome(maybeTokenAccountFrom)
			? BN.min(
					new BN(amoutInTokens),
					new BN(maybeTokenAccountFrom.value.amount.toString()),
				)
			: new BN(amoutInTokens);

		const programs = yield* SagePrograms;

		const signer = yield* gameService.signer;
		const gameId = context.gameInfo.game.key;
		const gameState = context.gameInfo.game.data.gameState;

		const withdrawCargoFromFleetIx = Fleet.withdrawCargoFromFleet(
			programs.sage,
			programs.cargo,
			signer,
			"funder",
			playerProfilePubkey,
			profileFactionPubkey,
			starbasePubkey,
			starbasePlayerPubkey,
			fleetAccount.key,
			cargoPodInfo.key,
			starbasePlayerCargoPodsPubkey,
			cargoTypeAddress,
			context.gameInfo.cargoStatsDefinition.key,
			cargoPodTokenAccount,
			starbasePlayerResourceMintAta,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: context.keyIndexes.sage, amount: maxAmountToWithdraw },
		);

		return [createStarbasePlayerResourceMintAtaIx, withdrawCargoFromFleetIx];
	});
