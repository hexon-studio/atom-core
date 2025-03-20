import { getAccount } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { Effect, Option, Record } from "effect";
import { computeDepositAmount } from "~/core/fleet/instructions/createDepositCargoToFleetIx/computeDepositAmout";
import { getGameContext } from "~/core/services/GameService/utils";
import {
	type CargoPodEnhanced,
	fetchCargoTypeAccount,
	findCargoTypePda,
} from "~/libs/@staratlas/cargo";
import {
	getCargoTypeResourceMultiplier,
	getCargoUnitsFromTokenAmount,
} from "~/libs/@staratlas/sage";
import type { LoadResourceInput } from "~/utils/decoders";
import { fetchTokenBalance } from "~/utils/fetchTokenBalance";
import { findAssociatedTokenPda } from "~/utils/findAssociatedTokenPda";
import { SolanaService } from "../services/SolanaService";

export const enhanceLoadResourceItem = ({
	item,
	cargoPodInfo,
	totalResourcesAmountInCargoUnits,
	starbasePlayerCargoPodsPubkey,
}: {
	item: LoadResourceInput & { id: string };
	totalResourcesAmountInCargoUnits: BN;
	cargoPodInfo: CargoPodEnhanced;
	starbasePlayerCargoPodsPubkey: PublicKey;
}) =>
	Effect.gen(function* () {
		const { amount, mode, cargoPodKind, resourceMint } = item;

		const context = yield* getGameContext();

		const starbaseResourceTokenAccount = yield* findAssociatedTokenPda({
			mint: resourceMint,
			owner: starbasePlayerCargoPodsPubkey,
		});

		const provider = yield* SolanaService.anchorProvider;

		const starbaseResourceAmountInTokens = yield* Effect.tryPromise(() =>
			getAccount(
				provider.connection,
				starbaseResourceTokenAccount,
				"confirmed",
			),
		).pipe(
			Effect.option,
			Effect.flatMap(
				Option.match({
					onNone: () => Effect.succeed(new BN(0)),
					onSome: () =>
						fetchTokenBalance(starbaseResourceTokenAccount).pipe(
							Effect.retry({ times: 3 }),
						),
				}),
			),
		);

		const resourceAmountInFleetInCargoUnits = Record.get(
			cargoPodInfo.resources,
			resourceMint.toString(),
		).pipe(
			Option.map((resource) => resource.amountInCargoUnits),
			Option.getOrElse(() => new BN(0)),
		);

		const [cargoTypeAddress] = yield* findCargoTypePda(
			resourceMint,
			context.gameInfo.cargoStatsDefinitionId,
			context.gameInfo.cargoStatsDefinitionSeqId,
		);

		const cargoTypeAccount = yield* fetchCargoTypeAccount(cargoTypeAddress);

		const amountInCargoUnits = getCargoUnitsFromTokenAmount({
			amount: new BN(amount),
			cargoType: cargoTypeAccount,
		});

		const computedAmountInCargoUnits = yield* computeDepositAmount({
			cargoPodKind,
			resourceMint,
			starbaseAddress: PublicKey.default,
		})({
			mode,
			resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits,
			resourceAmountInFleet: resourceAmountInFleetInCargoUnits,
			resourceAmountInStarbase: getCargoUnitsFromTokenAmount({
				amount: starbaseResourceAmountInTokens,
				cargoType: cargoTypeAccount,
			}),
			totalResourcesAmountInFleet: totalResourcesAmountInCargoUnits,
			value: amountInCargoUnits,
		});

		const resourceSpaceMultiplier =
			getCargoTypeResourceMultiplier(cargoTypeAccount);

		yield* Effect.log(
			`Load ${resourceMint.toString()} in ${cargoPodKind}`,
		).pipe(
			Effect.annotateLogs({
				resourceSpaceMultiplier: resourceSpaceMultiplier.toString(),
				resourceMint: resourceMint.toString(),
				cargoPodKind,
				resourceFleetMaxCap: cargoPodInfo.maxCapacityInCargoUnits.toString(),
				mode,
				totalResourcesAmountInFleet:
					cargoPodInfo.totalResourcesAmountInCargoUnits.toString(),
				resourceAmountInFleet: resourceAmountInFleetInCargoUnits.toString(),
				resourceAmountInStarbase: starbaseResourceAmountInTokens.toString(),
				amount: amount.toString(),
				amountInCargoUnits: amountInCargoUnits.toString(),
				computedAmountInCargoUnits: computedAmountInCargoUnits.toString(),
				computedAmountInTokens: computedAmountInCargoUnits
					.div(resourceSpaceMultiplier)
					.toString(),
			}),
		);

		return {
			id: item.id,
			cargoPodKind,
			cargoPodPublicKey: cargoPodInfo.cargoPod.key,
			cargoTypeAccount,
			computedAmountInCargoUnits,
			resourceMint,
			starbaseResourceTokenAccount,
		};
	});

export type EnhancedResourceItem = Effect.Effect.Success<
	ReturnType<typeof enhanceLoadResourceItem>
>;
