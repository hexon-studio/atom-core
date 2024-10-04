import type { PublicKey } from "@solana/web3.js";
import {
	type CargoStats,
	type Fleet,
	getCargoPodsByAuthority as sageGetCargoPodsByAuthority,
} from "@staratlas/sage";
import BN from "bn.js";
import { Data, Effect, Match } from "effect";
import type { CargoPodKind } from "../../types";
import {
	getCargoPodAccount,
	getCargoTypeAccount,
} from "../utils/accounts";
import { SagePrograms } from "../programs";
import { GameService } from "../services/GameService";
import { SolanaService } from "../services/SolanaService";

export class GetCargoPodsByAuthorityError extends Data.TaggedError(
	"GetCargoPodsByAuthorityError",
)<{ error: unknown }> {}

export const getCargoPodsByAuthority = (authority: PublicKey) =>
	SolanaService.pipe(
		Effect.flatMap((service) =>
			Effect.all([service.anchorProvider, SagePrograms]),
		),
		Effect.flatMap(([provider, programs]) =>
			Effect.tryPromise({
				try: () =>
					sageGetCargoPodsByAuthority(
						provider.connection,
						programs.cargo,
						authority,
					),
				catch: (error) => new GetCargoPodsByAuthorityError({ error }),
			}).pipe(Effect.head),
		),
	);

export class InvalidPodMaxCapacityError extends Data.TaggedError(
	"InvalidPodMaxCapacityError",
) {}

export const getCurrentCargoDataByType = ({
	type,
	fleetAccount,
}: {
	type: CargoPodKind;
	fleetAccount: Fleet;
}) =>
	Effect.gen(function* () {
		const cargoPodType = Match.value(type).pipe(
			Match.when("ammo_bank", () => fleetAccount.data.ammoBank),
			Match.when("cargo_hold", () => fleetAccount.data.cargoHold),
			Match.when("fuel_tank", () => fleetAccount.data.fuelTank),
			Match.exhaustive,
		);

		const cargoStats = fleetAccount.data.stats.cargoStats as CargoStats;

		const cargoPodMaxCapacity: BN = Match.value(type).pipe(
			Match.when("ammo_bank", () => new BN(cargoStats.ammoCapacity)),
			Match.when("cargo_hold", () => new BN(cargoStats.cargoCapacity)),
			Match.when("fuel_tank", () => new BN(cargoStats.fuelCapacity)),
			Match.exhaustive,
		);

		const cargoPod = yield* getCargoPodAccount(cargoPodType);

		const gameService = yield* GameService;

		const cargoPodTokenAccounts =
			yield* gameService.utils.getParsedTokenAccountsByOwner(cargoPod.key);

		const resources = [];

		for (const cargoPodTokenAccount of cargoPodTokenAccounts) {
			const cargoType = yield* getCargoTypeAccount(cargoPodTokenAccount.mint);

			const resourceSpaceInCargoPerUnit = cargoType.stats[0] as BN;

			resources.push({
				mint: cargoPodTokenAccount.mint,
				amount: new BN(cargoPodTokenAccount.amount.toString()),
				spaceInCargo: new BN(cargoPodTokenAccount.amount.toString()).mul(
					resourceSpaceInCargoPerUnit,
				),
				cargoTypeKey: cargoType.key,
				tokenAccountKey: cargoPodTokenAccount.address,
			});
		}

		const loadedAmount = resources.reduce(
			(acc, item) => acc.add(item.spaceInCargo),
			new BN(0),
		);

		return yield* Effect.succeed({
			key: cargoPod.key,
			loadedAmount,
			resources,
			maxCapacity: cargoPodMaxCapacity,
			fullLoad: loadedAmount.eq(cargoPodMaxCapacity),
		});
	});

export type CargoPodEnhanced = Effect.Effect.Success<
	ReturnType<typeof getCurrentCargoDataByType>
>;
