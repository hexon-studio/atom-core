import { getCargoPodsByAuthority } from './../../../cargo-utils/index';
import type { PublicKey } from "@solana/web3.js";
import { Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, Match, pipe } from "effect";
import { isNone } from "effect/Option";
import { resourceNameToMint } from "../../../../constants/resources";
import type { CargoPodKind } from "../../../../types";
import { getCurrentCargoDataByType } from "../../../cargo-utils";
import { SagePrograms } from "../../../programs";
import { GameService } from "../../../services/GameService";
import { getGameContext } from "../../../services/GameService/utils";
import { getFleetAccount, getStarbaseAccount, getCargoStatDefinition } from "../../../utils/accounts";
import { getSagePlayerProfileAddress, getProfileFactionAddress, getStarbasePlayerAddress, getCargoTypeAddress } from "../../../utils/pdas";
import { InvalidAmountError, InvalidResourceForPodKind, FleetNotInStarbaseError } from "../ixs";

export class FleetCargoPodTokenAccountNotFoundError extends Data.TaggedError(
	"FleetCargoPodTokenAccountNotFoundError",
) {}

export const createWithdrawCargoFromFleetIx = (
	fleetAddress: PublicKey,
	mint: PublicKey,
	amount: number,
	podKind: CargoPodKind,
) =>
	Effect.gen(function* () {
		if (amount <= 0) {
			return yield* Effect.fail(
				new InvalidAmountError({ resourceMint: mint, amount }),
			);
		}

		const isAllowed = Match.value(podKind).pipe(
			Match.when("fuel_tank", () => mint.equals(resourceNameToMint.Fuel)),
			Match.when("ammo_bank", () => mint.equals(resourceNameToMint.Ammunition)),
			Match.when("cargo_hold", () => true),
			Match.exhaustive,
		);

		if (!isAllowed) {
			return yield* Effect.fail(new InvalidResourceForPodKind());
		}

		// Fleet data
		const fleetAccount = yield* getFleetAccount(fleetAddress);

		if (!fleetAccount.state.StarbaseLoadingBay) {
			return yield* Effect.fail(new FleetNotInStarbaseError());
		}

		const gameService = yield* GameService;

		// Player Profile
		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			playerProfilePubkey,
		);

		const profileFactionPubkey =
			yield* getProfileFactionAddress(playerProfilePubkey);

		const cargoPod = yield* getCurrentCargoDataByType({
			fleetAccount,
			type: podKind,
		});

		const maybeTokenAccountFrom = yield* pipe(
			gameService.utils.getParsedTokenAccountsByOwner(cargoPod.key),
			Effect.flatMap(
				Effect.findFirst((account) =>
					Effect.succeed(account.mint.toBase58() === mint.toBase58()),
				),
			),
		);

		if (isNone(maybeTokenAccountFrom)) {
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

		const tokenAccountToATA =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				mint,
				starbasePlayerCargoPodsPubkey,
				true,
			);

		const tokenAccountToPubkey = tokenAccountToATA.address;

		const ix_0 = tokenAccountToATA.instructions;

		const amountBN = BN.min(
			new BN(amount),
			new BN(maybeTokenAccountFrom.value.amount.toString()),
		);

		if (amountBN.lte(new BN(0))) {
			return [ix_0];
		}

		const programs = yield* SagePrograms;

		const context = yield* getGameContext();
		const signer = yield* gameService.signer;
		const gameId = context.game.key;
		const gameState = context.game.data.gameState;
		
		const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

		const cargoStatsDefinitionAccount = yield* getCargoStatDefinition(cargoStatsDefinition);

		const cargoType = yield* getCargoTypeAddress(mint, cargoStatsDefinition, cargoStatsDefinitionAccount.data.seqId);

		const ix_1 = Fleet.withdrawCargoFromFleet(
			programs.sage,
			programs.cargo,
			signer,
			"funder",
			playerProfilePubkey,
			profileFactionPubkey,
			starbasePubkey,
			starbasePlayerPubkey,
			fleetAddress,
			cargoPod.key,
			starbasePlayerCargoPodsPubkey,
			cargoType,
			cargoStatsDefinition,
			tokenAccountFromPubkey,
			tokenAccountToPubkey,
			mint,
			gameId,
			gameState,
			{ keyIndex: 1, amount: amountBN },
		);

		return [ix_0, ix_1];
	});