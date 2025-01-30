import { Keypair } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Fleet, StarbasePlayer } from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, Option, Record, pipe } from "effect";
import {
	InvalidAmountError,
	InvalidResourceForPodKindError,
} from "~/core/fleet/errors";
import { getCurrentFleetSectorCoordinates } from "~/core/fleet/utils/getCurrentFleetSectorCoordinates";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import type { UnloadResourceInput } from "~/decoders";
import {
	type CargoPodEnhanced,
	findCargoPodPda,
	findCargoTypePda,
	getCargoTypeAccount,
	isResourceAllowedForCargoPod,
} from "~/libs/@staratlas/cargo";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import {
	findSagePlayerProfilePda,
	findStarbasePdaByCoordinates,
	findStarbasePlayerPda,
	getCargoUnitsFromTokenAmount,
	getStarbaseAccount,
} from "~/libs/@staratlas/sage";
import { getCargoPodsByAuthority } from "~/libs/@staratlas/sage/getCargoPodsByAuthority";
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";
import { getAssociatedTokenAddress } from "~/utils/getAssociatedTokenAddress";
import { computeWithdrawAmount } from "./computeWithdrawAmount";
import { SolanaService } from "~/core/services/SolanaService";
import { getAccount } from "@solana/spl-token";

export class FleetCargoPodTokenAccountNotFoundError extends Data.TaggedError(
	"FleetCargoPodTokenAccountNotFoundError",
) {}

export const createWithdrawCargoFromFleetIx = ({
	fleetAccount,
	item,
}: {
	fleetAccount: Fleet;
	item: UnloadResourceInput & { cargoPodInfo: CargoPodEnhanced };
}) =>
	Effect.gen(function* () {
		const { mode, resourceMint, amount, cargoPodKind, cargoPodInfo } = item;

		if (amount <= 0) {
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

		const provider = yield* SolanaService.anchorProvider;

		const playerProfilePubkey = fleetAccount.data.ownerProfile;

		const [sagePlayerProfilePubkey] = yield* findSagePlayerProfilePda(
			fleetAccount.data.gameId,
			playerProfilePubkey,
		);

		const [playerFactionAddress] =
			yield* findProfileFactionPda(playerProfilePubkey);

		const cargoPodTokenAccount = yield* getAssociatedTokenAddress(
			resourceMint,
			cargoPodInfo.cargoPod.key,
			true,
		);

		// Starbase where the fleet is located
		const fleetCoords = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const [starbaseAddress] = yield* findStarbasePdaByCoordinates(
			context.gameInfo.game.key,
			fleetCoords,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		// PDA Starbase - Player
		const [starbasePlayerAddress] = yield* findStarbasePlayerPda(
			starbaseAddress,
			sagePlayerProfilePubkey,
			starbaseAccount.data.seqId,
		);

		const programs = yield* getSagePrograms();
		const signer = yield* GameService.signer;

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

							const [starbasePlayerCargoPodAddress] =
								yield* findCargoPodPda(podSeedBuffer);

							return {
								ixs: [createCargoPodIx],
								starbasePlayerCargoPodAddress,
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
		} = yield* GameService.createAssociatedTokenAccountIdempotent(
			resourceMint,
			starbasePlayerCargoPodAddress,
			true,
		);

		const starbasePlayerResourceMintAtaAccount = yield* Effect.tryPromise(() =>
			getAccount(
				provider.connection,
				starbasePlayerResourceMintAta,
				"confirmed",
			),
		).pipe(Effect.option);

		if (Option.isNone(starbasePlayerResourceMintAtaAccount)) {
			ixs.push(createStarbasePlayerResourceMintAtaIx);
		}

		const [cargoTypeAddress] = yield* findCargoTypePda(
			resourceMint,
			context.gameInfo.cargoStatsDefinition.key,
			context.gameInfo.cargoStatsDefinition.data.seqId,
		);

		const cargoTypeAccount = yield* getCargoTypeAccount(cargoTypeAddress);

		const resourceAmountInFleetInCargoUnits = Record.get(
			cargoPodInfo.resources,
			resourceMint.toString(),
		).pipe(
			Option.map((resource) => resource.amountInCargoUnits),
			Option.getOrElse(() => new BN(0)),
		);

		const amountInCargoUnits = getCargoUnitsFromTokenAmount({
			amount: new BN(amount),
			cargoType: cargoTypeAccount,
		});

		const unloadAmountInCargoUnits = yield* computeWithdrawAmount({
			fleetAddress: fleetAccount.key,
			resourceMint,
		})({
			mode,
			resourceAmountInFleet: resourceAmountInFleetInCargoUnits,
			resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits,
			value: amountInCargoUnits,
		});

		const resourceSpaceMultiplier =
			getCargoTypeResourceMultiplier(cargoTypeAccount);

		const unloadAmount = unloadAmountInCargoUnits.div(resourceSpaceMultiplier);

		yield* Effect.log(`Unloading cargo from ${cargoPodKind}`).pipe(
			Effect.annotateLogs({
				cargoPodKind,
				amountInCargoUnits: amountInCargoUnits.toString(),
				amountInTokens: amount.toString(),
				mode,
				resourceAmountInFleet: resourceAmountInFleetInCargoUnits.toString(),
				resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits.toString(),
				unloadAmount: unloadAmount.toString(),
				unloadAmountInCargoUnits: unloadAmountInCargoUnits.toString(),
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
			cargoPodInfo.cargoPod.key,
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
