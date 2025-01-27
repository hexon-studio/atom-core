import { PublicKey } from "@solana/web3.js";
import type { CargoType } from "@staratlas/cargo";
import type { CargoStats, Fleet } from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, Match, Record } from "effect";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import type { CargoPodKind } from "~/decoders";
import {
	findCargoTypePda,
	getCargoPodAccount,
	getCargoTypeAccount,
} from "~/libs/@staratlas/cargo";
import { getCargoUnitsFromTokenAmount } from "~/libs/@staratlas/sage";
import { getCargoTypeResourceMultiplier } from "~/libs/@staratlas/sage/utils/getCargoTypeResourceMultiplier";

export class InvalidPodMaxCapacityError extends Data.TaggedError(
	"InvalidPodMaxCapacityError",
) {}

export const getFleetCargoPodInfoByType = ({
	type,
	fleetAccount,
}: {
	type: CargoPodKind;
	fleetAccount: Fleet;
}) =>
	Effect.gen(function* () {
		const cargoPodAddress = Match.value(type).pipe(
			Match.when("ammo_bank", () => fleetAccount.data.ammoBank),
			Match.when("cargo_hold", () => fleetAccount.data.cargoHold),
			Match.when("fuel_tank", () => fleetAccount.data.fuelTank),
			Match.exhaustive,
		);

		const cargoStats = fleetAccount.data.stats.cargoStats as CargoStats;

		const maxCapacityInCargoUnits: BN = Match.value(type).pipe(
			Match.when("ammo_bank", () => new BN(cargoStats.ammoCapacity)),
			Match.when("cargo_hold", () => new BN(cargoStats.cargoCapacity)),
			Match.when("fuel_tank", () => new BN(cargoStats.fuelCapacity)),
			Match.exhaustive,
		);

		const cargoPod = yield* getCargoPodAccount(cargoPodAddress);

		const context = yield* getGameContext();

		const cargoPodTokenAccounts =
			yield* GameService.getParsedTokenAccountsByOwner(cargoPod.key);

		const resources = yield* Effect.reduce(
			cargoPodTokenAccounts,
			Record.empty<
				string,
				{
					mint: PublicKey;
					amountInTokens: BN;
					amountInCargoUnits: BN;
					cargoTypeAccount: CargoType;
					tokenAccountKey: PublicKey;
				}
			>(),
			(acc, cargoPodTokenAccount) =>
				Effect.gen(function* () {
					const [cargoTypeKey] = yield* findCargoTypePda(
						cargoPodTokenAccount.mint,
						new PublicKey(context.gameInfo.cargoStatsDefinition.key),
						context.gameInfo.cargoStatsDefinition.data.seqId,
					);

					const cargoTypeAccount = yield* getCargoTypeAccount(cargoTypeKey);

					return Record.set(acc, cargoPodTokenAccount.mint.toString(), {
						mint: cargoPodTokenAccount.mint,
						amountInTokens: new BN(cargoPodTokenAccount.amount.toString()),
						amountInCargoUnits: getCargoUnitsFromTokenAmount({
							amount: new BN(cargoPodTokenAccount.amount.toString()),
							cargoType: cargoTypeAccount,
						}),
						cargoTypeAccount,
						tokenAccountKey: cargoPodTokenAccount.address,
					});
				}),
		);

		const totalResourcesAmountInCargoUnits = Record.values(resources).reduce(
			(acc, item) => acc.add(item.amountInCargoUnits),
			new BN(0),
		);

		const cargoPodInfo = {
			type,
			cargoPod,
			maxCapacityInCargoUnits,
			resources,
			totalResourcesAmountInCargoUnits,
		};

		yield* Effect.log(`Getting ${type} info`).pipe(
			Effect.annotateLogs({
				cargoPodInfo: {
					cargoPod: cargoPod.key.toString(),
					maxCapacityInCargoUnits: maxCapacityInCargoUnits.toString(),
					resources: Record.map(
						resources,
						({
							amountInCargoUnits,
							amountInTokens,
							cargoTypeAccount,
							mint,
							tokenAccountKey,
						}) => ({
							amountInCargoUnits: amountInCargoUnits.toString(),
							amountInTokens: amountInTokens.toString(),
							cargoTypeMultiplier:
								getCargoTypeResourceMultiplier(cargoTypeAccount).toString(),
							mint: mint.toString(),
							tokenAccountKey: tokenAccountKey.toString(),
						}),
					),
					totalResourcesAmountInCargoUnits:
						totalResourcesAmountInCargoUnits.toString(),
				},
			}),
		);

		return cargoPodInfo;
	});

export type CargoPodEnhanced = Effect.Effect.Success<
	ReturnType<typeof getFleetCargoPodInfoByType>
>;

export type CargoPodEnhancedResource = CargoPodEnhanced["resources"];
