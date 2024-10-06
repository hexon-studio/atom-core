import { Fleet, PlanetType } from "@staratlas/sage";
import { Effect, Match } from "effect";
import { resourceNameToMint } from "../../../constants/resources";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	getCargoTypeAddress,
	getMineItemAddress,
	getResourceAddress,
	getStarbaseAddressbyCoordinates,
} from "../../utils/pdas";
import type { PublicKey } from "@solana/web3.js";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import type BN from "bn.js";
import { isNone } from "effect/Option";
import { PlanetNotFoundInSectorError } from "../errors";
import { getAssociatedTokenAddress } from "../../../utils/getAssociatedTokenAddress";

type Param = {
	fleetAccount: Fleet;
	resourceMint: PublicKey;
};

export const createAsteroidMiningHandler = ({
	fleetAccount,
	resourceMint,
}: Param) =>
	Effect.gen(function* () {
		const gameService = yield* GameService;
		const programs = yield* SagePrograms;
		const context = yield* getGameContext();

		const foodCargoHoldAta = yield* getAssociatedTokenAddress(
			resourceNameToMint.Food,
			fleetAccount.data.cargoHold,
			true,
		);

		const ammoAmmoBankAta = yield* getAssociatedTokenAddress(
			resourceNameToMint.Ammunition,
			fleetAccount.data.ammoBank,
			true,
		);

		const resourceCargoHoldAta = yield* getAssociatedTokenAddress(
			resourceMint,
			fleetAccount.data.cargoHold,
			true,
		);

		const foodCargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Food,
			context.cargoStatsDefinition,
		);

		const ammoCargoTypeAddress = yield* getCargoTypeAddress(
			resourceNameToMint.Ammunition,
			context.cargoStatsDefinition,
		);

		const resourceCargoTypeAddress = yield* getCargoTypeAddress(
			resourceMint,
			context.cargoStatsDefinition,
		);

		const fleetCoordinates = yield* getCurrentFleetSectorCoordinates(
			fleetAccount.state,
		);

		const maybePlanet = yield* gameService.methods.findPlanets().pipe(
			Effect.flatMap(
				Effect.findFirst((planet) => {
					const [fleetX, fleetY] = fleetCoordinates;
					const [planetX, planetY] = planet.data.sector as [BN, BN];

					return Effect.succeed(
						planet.data.planetType === PlanetType.AsteroidBelt &&
							fleetX.eq(planetX) &&
							fleetY.eq(planetY),
					);
				}),
			),
		);

		if (isNone(maybePlanet)) {
			return yield* Effect.fail(
				new PlanetNotFoundInSectorError({ sector: fleetCoordinates }),
			);
		}

		const planetAddress = maybePlanet.value.key;

		const starbaseAddress = yield* getStarbaseAddressbyCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const mineItemKey = yield* getMineItemAddress(
			fleetAccount.data.gameId,
			resourceMint,
		);

		const resourceKey = yield* getResourceAddress(mineItemKey, planetAddress);

		const resourceTokenFromAta = yield* getAssociatedTokenAddress(
			resourceMint,
			mineItemKey,
			true,
		);

		const maybeAsteroidMiningHandlerIx = Match.value(fleetAccount.state).pipe(
			Match.when({ MineAsteroid: Match.defined }, () =>
				Fleet.asteroidMiningHandler(
					programs.sage,
					programs.cargo,
					fleetAccount.key,
					starbaseAddress,
					mineItemKey,
					resourceKey,
					planetAddress,
					fleetAccount.data.cargoHold,
					fleetAccount.data.ammoBank,
					foodCargoTypeAddress,
					ammoCargoTypeAddress,
					resourceCargoTypeAddress,
					context.cargoStatsDefinition.key,
					context.gameState.key,
					context.game.key,
					foodCargoHoldAta,
					ammoAmmoBankAta,
					resourceTokenFromAta,
					resourceCargoHoldAta,
					resourceNameToMint.Food,
					resourceNameToMint.Ammunition,
				),
			),
			Match.orElse(() => null),
		);

		return maybeAsteroidMiningHandlerIx ? [maybeAsteroidMiningHandlerIx] : [];
	});
