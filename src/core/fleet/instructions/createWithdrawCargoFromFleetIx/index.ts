import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, pipe } from "effect";
import { isNone } from "effect/Option";
import type { CargoPodKind } from "../../../../types";
import { isResourceAllowedForCargoPod } from "../../../../utils/resources/isResourceAllowedForCargoPod";
import { getFleetCargoPodInfoByType } from "../../../cargo-utils";
import { SagePrograms } from "../../../programs";
import { GameService } from "../../../services/GameService";
import { getGameContext } from "../../../services/GameService/utils";
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
import { InvalidAmountError, InvalidResourceForPodKind } from "../ixs";
import { getCargoPodsByAuthority } from "./../../../cargo-utils";

export class FleetCargoPodTokenAccountNotFoundError extends Data.TaggedError(
	"FleetCargoPodTokenAccountNotFoundError",
) {}

export const createWithdrawCargoFromFleetIx = ({
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
					reason: "Fleet is not in a starbase",
				}),
			);
		}

		const gameService = yield* GameService;

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

		const maybeTokenAccountFrom = yield* pipe(
			gameService.utils.getParsedTokenAccountsByOwner(cargoPodInfo.key),
			Effect.flatMap(
				Effect.findFirst((account) =>
					Effect.succeed(account.mint.toBase58() === resourceMint.toBase58()),
				),
			),
		);

		if (
			isNone(maybeTokenAccountFrom) ||
			maybeTokenAccountFrom.value.amount === 0n
		) {
			return yield* Effect.fail(new FleetCargoPodTokenAccountNotFoundError());
		}

		const tokenAccountFromPubkey = maybeTokenAccountFrom.value.address;

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

		const {
			address: starbasePlayerResourceMintAta,
			instructions: createStarbasePlayerResourceMintAtaIx,
		} = yield* gameService.utils.createAssociatedTokenAccountIdempotent(
			resourceMint,
			starbasePlayerCargoPodsPubkey,
			true,
		);

		const maxAmountToWithdraw = BN.min(
			new BN(amount),
			new BN(maybeTokenAccountFrom.value.amount.toString()),
		);

		const programs = yield* SagePrograms;

		const context = yield* getGameContext();
		const signer = yield* gameService.signer;
		const gameId = context.game.key;
		const gameState = context.game.data.gameState;

		const cargoStatsDefinitionKey = context.game.data.cargo.statsDefinition;

		const cargoStatsDefinition = yield* getCargoStatsDefinitionAccount(
			cargoStatsDefinitionKey,
		);

		const cargoType = yield* getCargoTypeAddress(
			resourceMint,
			cargoStatsDefinition,
		);

		const withdrawCargoFromFleetIx = Fleet.withdrawCargoFromFleet(
			programs.sage,
			programs.cargo,
			signer,
			"funder",
			playerProfilePubkey,
			profileFactionPubkey,
			starbasePubkey,
			starbasePlayerPubkey,
			fleetAddress,
			cargoPodInfo.key,
			starbasePlayerCargoPodsPubkey,
			cargoType,
			cargoStatsDefinition.key,
			tokenAccountFromPubkey,
			starbasePlayerResourceMintAta,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: 1, amount: maxAmountToWithdraw },
		);

		return [createStarbasePlayerResourceMintAtaIx, withdrawCargoFromFleetIx];
	});
