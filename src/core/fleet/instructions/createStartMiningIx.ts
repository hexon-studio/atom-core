import type { PublicKey } from "@solana/web3.js";
import { Fleet, PlanetType, StarbasePlayer } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect } from "effect";
import { isNone } from "effect/Option";
import { resourceNameToMint } from "../../../constants/resources";
import { getFleetCargoPodInfoByType } from "../../cargo-utils";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import {
	getFleetAccount,
	getStarbaseAccount,
	getStarbasePlayerAccount,
} from "../../utils/accounts";
import {
	getMineItemAddress,
	getProfileFactionAddress,
	getResourceAddress,
	getSagePlayerProfileAddress,
	getStarbaseAddressbyCoordinates,
	getStarbasePlayerAddress,
} from "../../utils/pdas";
import {
	FleetNotEnoughFuelError,
	FleetNotIdleError,
	PlanetNotFoundInSectorError,
} from "../errors";
import { getCurrentFleetSectorCoordinates } from "../utils/getCurrentFleetSectorCoordinates";
import { createMovementHandlerIx } from "./createMovementHandlerIx";

export const createStartMiningIx = ({
	fleetAddress,
	resourceMint,
}: {
	fleetAddress: PublicKey;
	resourceMint: PublicKey;
}) =>
	Effect.gen(function* () {
		const gameService = yield* GameService;

		const signer = yield* gameService.signer;

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		// TODO: ensure fleet state is "Idle" - is there a better way to do this?
		if (
			fleetAccount.state.MineAsteroid ||
			fleetAccount.state.StarbaseLoadingBay
		) {
			return yield* Effect.fail(new FleetNotIdleError());
		}

		const programs = yield* SagePrograms;

		const context = yield* getGameContext();

		const gameId = context.game.key;
		const gameState = context.game.data.gameState;

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

		const planetPubkey = maybePlanet.value.key;

		const starbaseAddress = yield* getStarbaseAddressbyCoordinates(
			fleetAccount.data.gameId,
			fleetCoordinates,
		);

		const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

		const playerProfile = fleetAccount.data.ownerProfile;

		const playerFactionAddress = yield* getProfileFactionAddress(playerProfile);

		const sagePlayerProfileAddress = yield* getSagePlayerProfileAddress(
			fleetAccount.data.gameId,
			playerProfile,
		);

		const starbasePlayerAddress = yield* getStarbasePlayerAddress(
			starbaseAccount.key,
			sagePlayerProfileAddress,
			starbaseAccount.data.seqId,
		);

		const starbasePlayerAccount = yield* getStarbasePlayerAccount(
			starbasePlayerAddress,
		).pipe(Effect.option);

		const ixs = [];

		if (isNone(starbasePlayerAccount)) {
			const ix_0 = StarbasePlayer.registerStarbasePlayer(
				programs.sage,
				playerFactionAddress,
				sagePlayerProfileAddress,
				starbaseAddress,
				gameId,
				gameState,
				starbaseAccount.data.seqId,
			);

			ixs.push(ix_0);
		}

		const maybeMoveHandlerIx = yield* createMovementHandlerIx(fleetAccount);

		ixs.push(...maybeMoveHandlerIx);

		const mineItemKey = yield* getMineItemAddress(
			fleetAccount.data.gameId,
			resourceMint,
		);

		const resourceKey = yield* getResourceAddress(mineItemKey, planetPubkey);

		const fleetKey = fleetAccount.key;

		const fielCargoPodInfo = yield* getFleetCargoPodInfoByType({
			type: "fuel_tank",
			fleetAccount,
		});

		const fuelInTankData = fielCargoPodInfo.resources.find((item) =>
			item.mint.equals(resourceNameToMint.Fuel),
		);

		if (!fuelInTankData) {
			return yield* Effect.fail(new FleetNotEnoughFuelError());
		}

		const miningIx = Fleet.startMiningAsteroid(
			programs.sage,
			signer,
			playerProfile,
			playerFactionAddress,
			fleetKey,
			starbaseAddress,
			starbasePlayerAddress,
			mineItemKey,
			resourceKey,
			planetPubkey,
			context.game.data.gameState,
			context.game.key,
			fuelInTankData.tokenAccountKey,
			{ keyIndex: 1 },
		);

		return [...ixs, miningIx];
	});
