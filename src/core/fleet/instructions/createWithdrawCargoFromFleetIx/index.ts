import { Keypair } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import {
	Fleet,
	SAGE_CARGO_STAT_VALUE_INDEX,
	StarbasePlayer,
} from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, Option, pipe } from "effect";
import type { UnloadResourceInput } from "../../../../decoders";
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
	getCargoPodAddress,
	getCargoTypeAddress,
	getProfileFactionAddress,
	getSagePlayerProfileAddress,
	getStarbaseAddressbyCoordinates,
	getStarbasePlayerAddress,
} from "../../../utils/pdas";
import { InvalidAmountError, InvalidResourceForPodKind } from "../../errors";
import { getCurrentFleetSectorCoordinates } from "../../utils/getCurrentFleetSectorCoordinates";
import { getCargoPodsByAuthority } from "./../../../cargo-utils";
import { computeWithdrawAmount } from "./computeWithdrawAmount";

export class FleetCargoPodTokenAccountNotFoundError extends Data.TaggedError(
	"FleetCargoPodTokenAccountNotFoundError",
) {}

export const createWithdrawCargoFromFleetIx = ({
	fleetAccount,
	item,
}: {
	fleetAccount: Fleet;
	item: UnloadResourceInput;
}) =>
	Effect.gen(function* () {
		const { mode, resourceMint, amount, cargoPodKind } = item;

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

		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			playerProfilePubkey,
		);

		const playerFactionAddress =
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
		const starbaseAddress = yield* getStarbaseAddressbyCoordinates(
			context.gameInfo.game.key,
			fleetCoords,
		);
		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		// PDA Starbase - Player
		const starbasePlayerAddress = yield* getStarbasePlayerAddress(
			starbaseAddress,
			sagePlayerProfilePubkey,
			starbaseAccount.data.seqId,
		);

		const programs = yield* SagePrograms;
		const signer = yield* gameService.signer;
		const gameId = context.gameInfo.game.key;
		const gameState = context.gameInfo.game.data.gameState;

		// This PDA account is the owner of all player resource token accounts
		// in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
		const starbasePlayerCargoPodAccount = yield* getCargoPodsByAuthority(
			starbasePlayerAddress,
		).pipe(Effect.option);

		const { ixs, starbasePlayerCargoPodAddress } =
			yield* starbasePlayerCargoPodAccount.pipe(
				Option.match({
					onNone: () =>
						Effect.gen(function* () {
							const podSeedBuffer = Keypair.generate().publicKey.toBuffer();
							const podSeeds = Array.from(podSeedBuffer);

							const createCargoPodIx = StarbasePlayer.createCargoPod(
								programs.sage,
								programs.cargo,
								starbasePlayerAddress,
								signer,
								context.playerProfile.key,
								playerFactionAddress,
								starbaseAddress,
								context.gameInfo.cargoStatsDefinition.key,
								gameId,
								gameState,
								{
									keyIndex: context.keyIndexes.sage,
									podSeeds,
								},
							);

							return {
								ixs: [createCargoPodIx],
								starbasePlayerCargoPodAddress:
									yield* getCargoPodAddress(podSeedBuffer),
							};
						}),
					onSome: (account) =>
						Effect.succeed({
							ixs: [] as InstructionReturn[],
							starbasePlayerCargoPodAddress: account.key,
						}),
				}),
			);

		const {
			address: starbasePlayerResourceMintAta,
			instructions: createStarbasePlayerResourceMintAtaIx,
		} = yield* gameService.utils.createAssociatedTokenAccountIdempotent(
			resourceMint,
			starbasePlayerCargoPodAddress,
			true,
		);

		ixs.push(createStarbasePlayerResourceMintAtaIx);

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

		const loadedResourcesAmountInCargoUnits = cargoPodInfo.resources.reduce(
			(acc, item) => {
				if (item.mint.equals(resourceMint)) {
					return acc.add(item.amountInCargoUnits);
				}

				return acc;
			},
			new BN(0),
		);

		const loadedResourcesAmountInTokens = loadedResourcesAmountInCargoUnits.div(
			resourceSpaceMultiplier,
		);

		const unloadAmount = yield* computeWithdrawAmount({
			fleetAddress: fleetAccount.key,
			resourceMint,
		})({
			mode,
			resourceAmountInFleet: loadedResourcesAmountInTokens,
			resourceFleetMaxCap: fleetMaxCapacityInTokens,
			value: new BN(amount),
		});

		yield* Effect.log("Unloading cargo amount").pipe(
			Effect.annotateLogs({
				mode,
				resourceAmountInFleet: loadedResourcesAmountInTokens.toString(),
				resourceFleetMaxCap: fleetMaxCapacityInTokens.toString(),
				amount,
				unloadAmount: unloadAmount.toString(),
			}),
		);

		if (unloadAmount.lten(0)) {
			yield* Effect.log(
				`Skip unload of ${resourceMint.toString()}, computed amount is: ${unloadAmount.toString()}`,
			);

			// Skip unload if less or equal than 0
			return [];
		}

		yield* Effect.log("Creating withdrawCargoFromFleet IX").pipe(
			Effect.annotateLogs({
				fleetAddress: fleetAccount.key.toString(),
				resourceMint: resourceMint.toString(),
				keyIndex: context.keyIndexes.sage,
				amount: unloadAmount.toString(),
			}),
		);

		const withdrawCargoFromFleetIx = Fleet.withdrawCargoFromFleet(
			programs.sage,
			programs.cargo,
			signer,
			"funder",
			playerProfilePubkey,
			playerFactionAddress,
			starbaseAddress,
			starbasePlayerAddress,
			fleetAccount.key,
			cargoPodInfo.key,
			starbasePlayerCargoPodAddress,
			cargoTypeAddress,
			context.gameInfo.cargoStatsDefinition.key,
			cargoPodTokenAccount,
			starbasePlayerResourceMintAta,
			resourceMint,
			gameId,
			gameState,
			{ keyIndex: context.keyIndexes.sage, amount: unloadAmount },
		);

		return [...ixs, withdrawCargoFromFleetIx];
	});
