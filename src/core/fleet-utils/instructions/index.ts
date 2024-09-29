import { PublicKey } from "@solana/web3.js";
import { BN } from "@staratlas/anchor";
import {
  CargoStats,
  DepositCargoToFleetInput,
  Fleet,
  LoadingBayToIdleInput,
  ShipStats,
  StartMiningAsteroidInput,
  StopMiningAsteroidInput,
} from "@staratlas/sage";
import { Data, Effect, pipe } from "effect";
import { isNone, isSome } from "effect/Option";
import { ResourceName, resourceNameToMint } from "../../../constants/resources";
import {
  getCargoPodsByAuthority,
  getCurrentCargoDataByType,
} from "../../cargo-utils";
import {
  getCouncilRankXpKey,
  getMiningXpKey,
  getPilotXpKey,
} from "../../points-utils/accounts";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { SolanaService } from "../../services/SolanaService";
import {
  getFleetAccount,
  getMineItemAccount,
  getPlanetAccount,
  getResourceAccount,
  getStarbaseAccount,
} from "../accounts";
import {
  getCargoTypeAddress,
  getMineItemAddress,
  getPlanetAddressbyCoordinates,
  getProfileFactionAddress,
  getResourceAddress,
  getSagePlayerProfileAddress,
  getStarbaseAddressbyCoordinates,
  getStarbasePlayerAddress,
} from "../addresses";

class CreateIdleToLoadingBayIxError extends Data.TaggedError(
  "CreateIdleToLoadingBayIxError"
)<{ error: unknown }> {}

export const createIdleToLoadingBayIx = ({
  fleet,
  input,
  starbase,
  starbasePlayer,
  playerProfile,
  profileFaction,
}: {
  playerProfile: PublicKey;
  profileFaction: PublicKey;
  fleet: PublicKey;
  starbase: PublicKey;
  starbasePlayer: PublicKey;
  input: LoadingBayToIdleInput;
}) =>
  Effect.gen(function* () {
    const programs = yield* SagePrograms;

    const [context, signer] = yield* pipe(
      GameService,
      Effect.flatMap((service) =>
        Effect.all([getGameContext(), service.signer])
      )
    );

    return yield* Effect.try({
      try: () =>
        Fleet.idleToLoadingBay(
          programs.sage,
          signer,
          playerProfile,
          profileFaction,
          fleet,
          starbase,
          starbasePlayer,
          context.game.key,
          context.game.data.gameState,
          input
        ),
      catch: (error) => new CreateIdleToLoadingBayIxError({ error }),
    });
  });

export class FleetNotIdleError extends Data.TaggedError("FleetNotIdleError") {}

export class NoEnoughRepairKitsError extends Data.TaggedError(
  "NoEnoughRepairKitsError"
) {}

// export const createScanForSurveyDataUnitsIx = (fleetPubkey: PublicKey) =>
//   Effect.gen(function* () {
//     const fleetAccount = yield* getFleetAccount(fleetPubkey);

//     if (!fleetAccount.state.Idle) {
//       return yield* Effect.fail(new FleetNotIdleError());
//     }

//     const gameService = yield* GameService;
//     const solanaService = yield* SolanaService;

//     const context = yield* gameContext;

//     const signer = yield* gameService.signer;

//     const program = yield* SagePrograms.sage;
//     const cargo = yield* SagePrograms.cargo;
//     const points = yield* SagePrograms.points;

//     const fleetCargoHold = fleetAccount.data.cargoHold;
//     // const miscStats = fleetAccount.data.stats.miscStats as MiscStats;

//     const playerProfile = fleetAccount.data.ownerProfile;
//     const profileFaction = yield* getProfileFactionAddress(playerProfile);

//     const gameState = context.game.data.gameState;

//     const input = { keyIndex: 0 } as ScanForSurveyDataUnitsInput;

//     const surveyDataUnitTracker = new PublicKey(
//       "EJ74A2vb3HFhaEh4HqdejPpQoBjnyEctotcx1WudChwj"
//     );

//     const signerAddress = yield* Effect.try(() => {
//       const [signerAddress] = SurveyDataUnitTracker.findSignerAddress(
//         program,
//         surveyDataUnitTracker
//       );
//       return signerAddress;
//     });

//     const repairKitMint = context.game.data.mints.repairKit;

//     const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

//     const repairKitCargoType = yield* getCargoTypeAddress(
//       repairKitMint,
//       cargoStatsDefinition
//     );

//     const sduCargoType = yield* getCargoTypeAddress(
//       resourceNameToMint.SurveyDataUnit,
//       cargoStatsDefinition
//     );

//     const sduTokenFrom = yield* solanaService.getAssociatedTokenAddress(
//       resourceNameToMint.SurveyDataUnit,
//       signerAddress,
//       true
//     );

//     const sduTokenTo = createAssociatedTokenAccountIdempotent(
//       resourceNameToMint.SurveyDataUnit,
//       fleetCargoHold
//     );

//     const ix_0 = sduTokenTo.instructions;

//     const repairKitTokenFrom = yield* solanaService.getAssociatedTokenAddress(
//       repairKitMint,
//       fleetCargoHold,
//       true
//     );

//     if (!repairKitTokenFrom) {
//       return yield* Effect.fail(new NoEnoughRepairKitsError());
//     }

//     const cargoPodFromKey = fleetAccount.data.cargoHold;

//     const maybeTokenAccount = yield* pipe(
//       gameService.utils.getParsedTokenAccountsByOwner(cargoPodFromKey),
//       Effect.flatMap(
//         Effect.findFirst((account) =>
//           Effect.succeed(account.mint.toBase58() === repairKitMint.toBase58())
//         )
//       )
//     );

//     if (isNone(maybeTokenAccount)) {
//       return yield* Effect.fail(new NoEnoughRepairKitsError());
//     }

//     // if (maybeTokenAccount.value.amount < miscStats.scanRepairKitAmount) {
//     //   return yield* Effect.fail(new NoEnoughRepairKitsError());
//     // }

//     const ix_1 = SurveyDataUnitTracker.scanForSurveyDataUnits(
//       program,
//       cargo,
//       points,
//       signer,
//       playerProfile,
//       profileFaction,
//       fleetPubkey,
//       surveyDataUnitTracker,
//       fleetCargoHold,
//       sduCargoType,
//       repairKitCargoType,
//       cargoStatsDefinition,
//       sduTokenFrom,
//       sduTokenTo.address,
//       repairKitTokenFrom,
//       repairKitMint,
//       context.game.key,
//       gameState,
//       input
//     );

//     return ix_0 ? [ix_0, ix_1] : [ix_1];
//   });

export const createDockToStarbaseIx = (fleetPubkey: PublicKey) =>
  Effect.gen(function* () {
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.Idle) {
      return yield* Effect.fail(new FleetNotIdleError());
    }

    const playerProfileAddress = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      fleetAccount.data.ownerProfile
    );

    const playerFactionAddress = yield* getProfileFactionAddress(
      fleetAccount.data.ownerProfile
    );

    const starbaseAddress = yield* getStarbaseAddressbyCoordinates(
      fleetAccount.data.gameId,
      fleetAccount.state.Idle!.sector as [BN, BN]
    );

    const starbaseAccount = yield* getStarbaseAccount(starbaseAddress);

    const starbasePlayerAddress = yield* getStarbasePlayerAddress(
      starbaseAccount.key,
      playerProfileAddress,
      starbaseAccount.data.seqId
    );

    return yield* createIdleToLoadingBayIx({
      profileFaction: playerFactionAddress,
      fleet: fleetAccount.key,
      input: 0 as LoadingBayToIdleInput,
      playerProfile: fleetAccount.data.ownerProfile,
      starbase: starbaseAccount.key,
      starbasePlayer: starbasePlayerAddress,
    });
  });

class FleetNotInStarbaseError extends Data.TaggedError(
  "FleetNotInStarbaseError"
) {}

export const createUndockFromStarbaseIx = (fleetPubkey: PublicKey) =>
  Effect.gen(function* () {
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const [programs, context, signer] = yield* pipe(
      GameService,
      Effect.flatMap((service) =>
        Effect.all([SagePrograms, getGameContext(), service.signer])
      )
    );

    const starbaseKey = fleetAccount.state.StarbaseLoadingBay.starbase;
    const starbaseAccount = yield* getStarbaseAccount(starbaseKey);

    const sagePlayerProfileAddress = yield* getSagePlayerProfileAddress(
      context.game.key,
      fleetAccount.data.ownerProfile
    );

    const playerFactionAddress = yield* getProfileFactionAddress(
      fleetAccount.data.ownerProfile
    );

    const starbasePlayerKey = yield* getStarbasePlayerAddress(
      starbaseKey,
      sagePlayerProfileAddress,
      starbaseAccount.data.seqId
    );

    // TODO: when would this change?
    const input: LoadingBayToIdleInput = 0;

    return Fleet.loadingBayToIdle(
      programs.sage,
      signer,
      fleetAccount.data.ownerProfile,
      playerFactionAddress,
      fleetAccount.key,
      starbaseKey,
      starbasePlayerKey,
      context.game.key,
      context.game.data.gameState,
      input
    );
  });

export const getTimeAndNeededResourcesToFullCargoInMining = (
  fleetPubkey: PublicKey,
  resourceName: ResourceName,
  starbaseCoordinates: [BN, BN]
) =>
  Effect.gen(function* () {
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    const fleetStats = fleetAccount.data.stats as ShipStats;
    const cargoStats = fleetStats.cargoStats;

    const mint = resourceNameToMint[resourceName];

    const mineItemPubkey = yield* getMineItemAddress(
      fleetAccount.data.gameId,
      mint
    );

    const mineItemAccount = yield* getMineItemAccount(mineItemPubkey);

    const starbasePubkey = yield* getStarbaseAddressbyCoordinates(
      fleetAccount.data.gameId,
      starbaseCoordinates
    );
    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    const planetPubkey = yield* getPlanetAddressbyCoordinates(
      starbaseAccount.data.sector as [BN, BN]
    );

    const resourcePubkey = yield* getResourceAddress(
      mineItemPubkey,
      planetPubkey
    );
    const resourceAccount = yield* getResourceAccount(resourcePubkey);

    const timeInSeconds =
      Fleet.calculateAsteroidMiningResourceExtractionDuration(
        fleetStats,
        mineItemAccount.data,
        resourceAccount.data,
        cargoStats.cargoCapacity
      );

    const food = Fleet.calculateAsteroidMiningFoodToConsume(
      fleetStats,
      999_999_999,
      timeInSeconds
    );

    const ammo = Fleet.calculateAsteroidMiningAmmoToConsume(
      fleetStats,
      999_999_999,
      timeInSeconds
    );

    return {
      fuel: fleetStats.movementStats.planetExitFuelAmount,
      ammo,
      food,
      timeInSeconds,
    };
  });

class FuelNotEnoughError extends Data.TaggedError("FuelNotEnoughError") {}

export const createStartMiningIx = (
  fleetPubkey: PublicKey,
  resourceName: ResourceName
) =>
  Effect.gen(function* () {
    const programs = yield* SagePrograms;
    const signer = yield* GameService.pipe(
      Effect.flatMap((service) => service.signer)
    );
    const context = yield* getGameContext();
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    // TODO: ensure fleet state is "Idle" - is there a better way to do this?
    if (!fleetAccount.state.Idle) {
      return yield* Effect.fail(new FleetNotIdleError());
    }

    // TODO: is there a better way determine if anything is mineable (mint) at this 'location'?
    // see `getPlanetAddress` in sageGameHandler.ts (cache of planet addresses on load)
    const coordinates = fleetAccount.state.Idle.sector as [BN, BN];

    const starbaseKey = yield* getStarbaseAddressbyCoordinates(
      fleetAccount.data.gameId,
      coordinates
    );

    const starbaseAccount = yield* getStarbaseAccount(starbaseKey);

    const playerProfile = fleetAccount.data.ownerProfile;

    const sagePlayerProfile = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfile
    );

    const starbasePlayerKey = yield* getStarbasePlayerAddress(
      starbaseKey,
      sagePlayerProfile,
      starbaseAccount.data.seqId
    );

    const planetKey = yield* getPlanetAddressbyCoordinates(
      starbaseAccount.data.sector as [BN, BN]
    );

    const mint = resourceNameToMint[resourceName];

    const mineItemKey = yield* getMineItemAddress(
      fleetAccount.data.gameId,
      mint
    );

    const resourceKey = yield* getResourceAddress(mineItemKey, planetKey);

    const profileFaction = yield* getProfileFactionAddress(playerProfile);

    const fleetKey = fleetAccount.key;

    const input = { keyIndex: 0 } as StartMiningAsteroidInput;

    const fuelTank = yield* getCurrentCargoDataByType({
      type: "fuel_tank",
      fleetAccount,
    });

    const fuelInTankData = fuelTank.resources.find((item) =>
      item.mint.equals(resourceNameToMint.Fuel)
    );

    if (!fuelInTankData) {
      return yield* Effect.fail(new FuelNotEnoughError());
    }

    return yield* Effect.try(() =>
      Fleet.startMiningAsteroid(
        programs.sage,
        signer,
        playerProfile,
        profileFaction,
        fleetKey,
        starbaseKey,
        starbasePlayerKey,
        mineItemKey,
        resourceKey,
        planetKey,
        context.game.data.gameState,
        context.game.key,
        fuelInTankData.tokenAccountKey,
        input
      )
    );
  });

class FleetNotMintingError extends Data.TaggedError("FleetNotMintingError") {}

export const createStopMiningIx = (fleetPubkey: PublicKey) =>
  Effect.gen(function* () {
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    // TODO: ensure fleet state is "MineAsteroid" - is there a better way to do this?
    if (!fleetAccount.state.MineAsteroid) {
      return yield* Effect.fail(new FleetNotMintingError());
    }

    const gameService = yield* GameService;
    const solanaService = yield* SolanaService;

    const context = yield* getGameContext();

    const gameFoodMint = context.game.data.mints.food;
    const gameAmmoMint = context.game.data.mints.ammo;
    const gameFuelMint = context.game.data.mints.fuel;

    const resourceKey = fleetAccount.state.MineAsteroid.resource;

    const resourceAccount = yield* getResourceAccount(resourceKey);

    const mineItemKey = resourceAccount.data.mineItem; // TODO: check if this is the only way to get the 'mineItemKey'
    const mineItemAccount = yield* getMineItemAccount(mineItemKey);
    const mint = mineItemAccount.data.mint; // TODO: check if this is the only way get the 'mint'

    const planetKey = fleetAccount.state.MineAsteroid.asteroid;
    const planetAccount = yield* getPlanetAccount(planetKey);

    const coordinates = planetAccount.data.sector as [BN, BN]; // TODO: check if this is the only way get the 'coordinates'
    const starbaseKey = yield* getStarbaseAddressbyCoordinates(
      context.game.key,
      coordinates
    );

    const cargoHold = fleetAccount.data.cargoHold;
    const fleetAmmoBank = fleetAccount.data.ammoBank;
    const fleetFuelTank = fleetAccount.data.fuelTank;

    const resourceTokenFrom = yield* solanaService.getAssociatedTokenAddress(
      mint,
      mineItemKey,
      true
    );

    const ataResourceTokenTo =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        mint,
        cargoHold,
        true
      );

    const resourceTokenTo = ataResourceTokenTo.address;

    const ix_0 = ataResourceTokenTo.instructions;

    const fleetFoodToken = yield* solanaService.getAssociatedTokenAddress(
      gameFoodMint,
      cargoHold,
      true
    );
    const fleetAmmoToken = yield* solanaService.getAssociatedTokenAddress(
      gameAmmoMint,
      fleetAmmoBank,
      true
    );
    const fleetFuelToken = yield* solanaService.getAssociatedTokenAddress(
      gameFuelMint,
      fleetFuelTank,
      true
    );

    const programs = yield* SagePrograms;

    const playerProfile = fleetAccount.data.ownerProfile;

    const profileFaction = yield* getProfileFactionAddress(playerProfile);

    const fleetKey = fleetAccount.key;
    const ammoBank = fleetAccount.data.ammoBank;

    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

    const foodCargoType = yield* getCargoTypeAddress(
      gameFoodMint,
      cargoStatsDefinition
    );
    const ammoCargoType = yield* getCargoTypeAddress(
      gameAmmoMint,
      cargoStatsDefinition
    );
    const resourceCargoType = yield* getCargoTypeAddress(
      mint,
      cargoStatsDefinition
    );

    const gameState = context.game.data.gameState;
    const gameId = context.game.key;
    const foodTokenFrom = fleetFoodToken;
    const ammoTokenFrom = fleetAmmoToken;
    const foodMint = gameFoodMint;
    const ammoMint = gameAmmoMint;

    const ix_1 = Fleet.asteroidMiningHandler(
      programs.sage,
      programs.cargo,
      fleetKey,
      starbaseKey,
      mineItemKey,
      resourceKey,
      planetKey,
      cargoHold,
      ammoBank,
      foodCargoType,
      ammoCargoType,
      resourceCargoType,
      cargoStatsDefinition,
      gameState,
      gameId,
      foodTokenFrom,
      ammoTokenFrom,
      resourceTokenFrom,
      resourceTokenTo,
      foodMint,
      ammoMint
    );

    const signer = yield* gameService.signer;
    const fuelTank = fleetFuelTank;

    const fuelCargoType = yield* getCargoTypeAddress(
      gameFuelMint,
      cargoStatsDefinition
    );

    const fuelTokenFrom = fleetFuelToken;
    const fuelMint = gameFuelMint;
    const input = { keyIndex: 0 } as StopMiningAsteroidInput;

    const miningXpKey = yield* getMiningXpKey(playerProfile);
    const pilotXpKey = yield* getPilotXpKey(playerProfile);
    const councilRankXpKey = yield* getCouncilRankXpKey(playerProfile);

    const ix_2 = Fleet.stopMiningAsteroid(
      programs.sage,
      programs.cargo,
      programs.points,
      signer,
      playerProfile,
      profileFaction,
      fleetKey,
      mineItemKey,
      resourceKey,
      planetKey,
      fuelTank,
      fuelCargoType,
      cargoStatsDefinition,
      miningXpKey,
      //@ts-ignore
      context.game.data.points.miningXpCategory.category,
      //@ts-ignore
      context.game.data.points.miningXpCategory.modifier,
      pilotXpKey,
      //@ts-ignore
      context.game.data.points.pilotXpCategory.category,
      //@ts-ignore
      context.game.data.points.pilotXpCategory.modifier,
      councilRankXpKey,
      //@ts-ignore
      context.game.data.points.councilRankXpCategory.category,
      //@ts-ignore
      context.game.data.points.councilRankXpCategory.modifier,
      gameState,
      gameId,
      fuelTokenFrom,
      fuelMint,
      input
    );

    return [ix_0, ix_1, ix_2];
  });

class InvalidAmountError extends Data.TaggedError("InvalidAmountError") {}

class StarbaseCargoPodTokenAccountNotFoundError extends Data.TaggedError(
  "StarbaseCargoPodTokenAccountNotFound"
) {}

export const createDepositCargoToFleetIx = (
  fleetAddress: PublicKey,
  mint: PublicKey,
  amount: number
) =>
  Effect.gen(function* () {
    if (amount < 0) {
      return yield* Effect.fail(new InvalidAmountError());
    }

    // Fleet data
    const fleetAccount = yield* getFleetAccount(fleetAddress);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const fleetCargoStats = fleetAccount.data.stats.cargoStats as CargoStats;

    // Player Profile
    const playerProfilePubkey = fleetAccount.data.ownerProfile;

    const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfilePubkey
    );

    const profileFactionPubkey = yield* getProfileFactionAddress(
      playerProfilePubkey
    );

    // Starbase where the fleet is located
    const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;
    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    // PDA Starbase - Player
    const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
      starbasePubkey,
      sagePlayerProfilePubkey,
      starbaseAccount.data.seqId
    );

    // This PDA account is the owner of all player resource token accounts
    // in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
    const starbasePlayerCargoPodsAccount = yield* getCargoPodsByAuthority(
      starbasePlayerPubkey
    );

    const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

    const gameService = yield* GameService;

    const maybeTokenAccountFrom = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(
        starbasePlayerCargoPodsPubkey
      ),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === mint.toBase58())
        )
      )
    );

    if (isNone(maybeTokenAccountFrom)) {
      return yield* Effect.fail(
        new StarbaseCargoPodTokenAccountNotFoundError()
      );
    }

    const tokenAccountFromPubkey = maybeTokenAccountFrom.value.address;
    const tokenAccountFromAmount = new BN(maybeTokenAccountFrom.value.amount);

    // This PDA account is the owner of all the resources in the fleet's cargo (Fleet Cargo Holds - Stiva della flotta)
    const fleetCargoHoldsPubkey = fleetAccount.data.cargoHold;

    const maybeTokenAccountTo = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(fleetCargoHoldsPubkey),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === mint.toBase58())
        )
      )
    );

    const tokenAccountToATA =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        mint,
        fleetCargoHoldsPubkey,
        true
      );

    const tokenAccountToPubkey = tokenAccountToATA.address;

    const ix_0 = tokenAccountToATA.instructions;

    // amount > fleet free capacity?
    let amountBN = BN.min(
      new BN(amount),
      isSome(maybeTokenAccountTo)
        ? new BN(fleetCargoStats.cargoCapacity).sub(
            new BN(maybeTokenAccountTo.value.amount)
          )
        : new BN(fleetCargoStats.cargoCapacity)
    );

    // amount > starbase amount?
    amountBN = BN.min(amountBN, tokenAccountFromAmount);

    if (amountBN <= 0) {
      return [ix_0];
    }

    const programs = yield* SagePrograms;
    const signer = yield* gameService.signer;

    const context = yield* getGameContext();

    const gameId = context.game.key;
    const gameState = context.game.data.gameState;
    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

    const cargoType = yield* getCargoTypeAddress(mint, cargoStatsDefinition);

    const ix_1 = Fleet.depositCargoToFleet(
      programs.sage,
      programs.cargo,
      signer,
      playerProfilePubkey,
      profileFactionPubkey,
      "funder",
      starbasePubkey,
      starbasePlayerPubkey,
      fleetAddress,
      starbasePlayerCargoPodsPubkey,
      fleetCargoHoldsPubkey,
      cargoType,
      cargoStatsDefinition,
      tokenAccountFromPubkey,
      tokenAccountToPubkey,
      mint,
      gameId,
      gameState,
      { keyIndex: 1, amount: amountBN }
    );

    return [ix_0, ix_1];
  });

class FleetCargoHoldTokenAccountNotFoundError extends Data.TaggedError(
  "FleetCargoHoldTokenAccountNotFoundError"
) {}

//   // New
//   // TODO: improve error handling
export const createWithdrawCargoFromFleetIx = (
  fleetPubkey: PublicKey,
  tokenMint: PublicKey,
  amount: number
) =>
  Effect.gen(function* () {
    if (amount < 0) {
      return yield* Effect.fail(new InvalidAmountError());
    }

    // Fleet data
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const gameService = yield* GameService;

    // Player Profile
    const playerProfilePubkey = fleetAccount.data.ownerProfile;

    const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfilePubkey
    );

    const profileFactionPubkey = yield* getProfileFactionAddress(
      playerProfilePubkey
    );

    // This PDA account is the owner of all the resources
    // in the fleet's cargo (Fleet Cargo Holds - Stiva della flotta)
    const fleetCargoHoldsPubkey = fleetAccount.data.cargoHold;

    const maybeTokenAccountFrom = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(fleetCargoHoldsPubkey),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === tokenMint.toBase58())
        )
      )
    );

    if (isNone(maybeTokenAccountFrom)) {
      return yield* Effect.fail(new FleetCargoHoldTokenAccountNotFoundError());
    }

    const tokenAccountFromPubkey = maybeTokenAccountFrom.value.address;

    // Starbase where the fleet is located
    const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;
    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    // PDA Starbase - Player
    const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
      starbasePubkey,
      sagePlayerProfilePubkey,
      starbaseAccount.data.seqId
    );

    // This PDA account is the owner of all player resource token accounts
    // in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
    const starbasePlayerCargoPodsAccount = yield* getCargoPodsByAuthority(
      starbasePlayerPubkey
    );

    const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

    const tokenAccountToATA =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        tokenMint,
        starbasePlayerCargoPodsPubkey,
        true
      );

    const tokenAccountToPubkey = tokenAccountToATA.address;

    const ix_0 = tokenAccountToATA.instructions;

    const amountBN = BN.min(
      new BN(amount),
      new BN(maybeTokenAccountFrom.value.amount)
    );

    if (amountBN <= 0) {
      return [ix_0];
    }

    const programs = yield* SagePrograms;

    const context = yield* getGameContext();
    const signer = yield* gameService.signer;
    const gameId = context.game.key;
    const gameState = context.game.data.gameState;
    const input = { keyIndex: 0, amount: amountBN } as DepositCargoToFleetInput;
    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

    const cargoType = yield* getCargoTypeAddress(
      tokenMint,
      cargoStatsDefinition
    );

    const ix_1 = Fleet.withdrawCargoFromFleet(
      programs.sage,
      programs.cargo,
      signer,
      signer.publicKey(),
      playerProfilePubkey,
      profileFactionPubkey,
      starbasePubkey,
      starbasePlayerPubkey,
      fleetPubkey,
      fleetCargoHoldsPubkey,
      starbasePlayerCargoPodsPubkey,
      cargoType,
      cargoStatsDefinition,
      tokenAccountFromPubkey,
      tokenAccountToPubkey,
      tokenMint,
      gameId,
      gameState,
      input
    );

    return [ix_0, ix_1];
  });

//   // New
//   // TODO: improve error handling
export const createRefuelFleetIx = (fleetPubkey: PublicKey, amount: number) =>
  Effect.gen(function* () {
    if (amount < 0) {
      return yield* Effect.fail(new InvalidAmountError());
    }

    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const fleetCargoStats = fleetAccount.data.stats.cargoStats as CargoStats;

    const fuelMint = resourceNameToMint.Fuel;

    // Player Profile
    const playerProfilePubkey = fleetAccount.data.ownerProfile;
    const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfilePubkey
    );

    const profileFactionPubkey = yield* getProfileFactionAddress(
      playerProfilePubkey
    );

    // Starbase where the fleet is located
    const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;

    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    // PDA Starbase - Player
    const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
      starbasePubkey,
      sagePlayerProfilePubkey,
      starbaseAccount.data.seqId
    );

    // This PDA account is the owner of all player resource token accounts
    // in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
    const starbasePlayerCargoPodsAccount = yield* getCargoPodsByAuthority(
      starbasePlayerPubkey
    );
    const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

    const gameService = yield* GameService;

    const maybeTokenAccountFrom = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(
        starbasePlayerCargoPodsPubkey
      ),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === fuelMint.toBase58())
        )
      )
    );

    if (isNone(maybeTokenAccountFrom)) {
      return yield* Effect.fail(new FleetCargoHoldTokenAccountNotFoundError());
    }

    const tokenAccountFromPubkey = maybeTokenAccountFrom.value.address;

    // This PDA account is the owner of all the resources
    // in the fleet's cargo (Fleet Cargo Holds - Stiva della flotta)
    const fleetFuelTankPubkey = fleetAccount.data.fuelTank;

    const maybeTokenAccountTo = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(fleetFuelTankPubkey),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === fuelMint.toBase58())
        )
      )
    );

    const tokenAccountToATA =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        fuelMint,
        fleetFuelTankPubkey,
        true
      );

    const tokenAccountToPubkey = tokenAccountToATA.address;

    const ix_0 = tokenAccountToATA.instructions;

    // amount > fleet free capacity?
    let amountBN = BN.min(
      new BN(amount),
      isSome(maybeTokenAccountTo)
        ? new BN(fleetCargoStats.fuelCapacity).sub(
            new BN(maybeTokenAccountTo.value.amount)
          )
        : new BN(fleetCargoStats.fuelCapacity)
    );

    // amount > starbase amount?
    amountBN = BN.min(amountBN, new BN(maybeTokenAccountFrom.value.amount));

    if (amountBN <= 0) {
      return [ix_0];
    }

    const programs = yield* SagePrograms;

    const context = yield* getGameContext();
    const signer = yield* gameService.signer;
    const gameId = context.game.key;
    const gameState = context.game.data.gameState;
    const input: DepositCargoToFleetInput = { keyIndex: 0, amount: amountBN };
    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

    const cargoType = yield* getCargoTypeAddress(
      fuelMint,
      cargoStatsDefinition
    );

    const ix_1 = Fleet.depositCargoToFleet(
      programs.sage,
      programs.cargo,
      signer,
      playerProfilePubkey,
      profileFactionPubkey,
      signer.publicKey(),
      starbasePubkey,
      starbasePlayerPubkey,
      fleetPubkey,
      starbasePlayerCargoPodsPubkey,
      fleetFuelTankPubkey,
      cargoType,
      cargoStatsDefinition,
      tokenAccountFromPubkey,
      tokenAccountToPubkey,
      fuelMint,
      gameId,
      gameState,
      input
    );

    return [ix_0, ix_1];
  });

class FleetFuelTankTokenAccountNotFoundError extends Data.TaggedError(
  "FleetFuelTankTokenAccountNotFoundError"
) {}

// New
// TODO: improve error handling
export const createUnloadFuelTanksIx = (
  fleetPubkey: PublicKey,
  amount: number
) =>
  Effect.gen(function* () {
    if (amount < 0) {
      return yield* Effect.fail(new InvalidAmountError());
    }

    // Fleet data

    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const fuelMint = resourceNameToMint.Fuel;

    // Player Profile
    const playerProfilePubkey = fleetAccount.data.ownerProfile;

    const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfilePubkey
    );

    const profileFactionPubkey = yield* getProfileFactionAddress(
      playerProfilePubkey
    );

    // Starbase where the fleet is located
    const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;
    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    // PDA Starbase - Player
    const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
      starbasePubkey,
      sagePlayerProfilePubkey,
      starbaseAccount.data.seqId
    );

    // This PDA account is the owner of all player resource token accounts
    // in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
    const starbasePlayerCargoPodsAccount = yield* getCargoPodsByAuthority(
      starbasePlayerPubkey
    );

    const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

    const gameService = yield* GameService;

    const tokenAccountFromATA =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        fuelMint,
        starbasePlayerCargoPodsPubkey,
        true
      );

    const tokenAccountFromPubkey = tokenAccountFromATA.address;

    const ix_0 = tokenAccountFromATA.instructions;

    // This PDA account is the owner of all the resources in the fleet's cargo (Fleet Cargo Holds - Stiva della flotta)
    const fleetFuelTankPubkey = fleetAccount.data.fuelTank;

    const maybeTokenAccountTo = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(fleetFuelTankPubkey),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === fuelMint.toBase58())
        )
      )
    );

    if (isNone(maybeTokenAccountTo)) {
      return yield* Effect.fail(new FleetFuelTankTokenAccountNotFoundError());
    }

    const tokenAccountToPubkey = maybeTokenAccountTo.value.address;

    let amountBN = BN.min(
      new BN(amount),
      new BN(maybeTokenAccountTo.value.amount)
    );

    if (amountBN <= 0) {
      return [ix_0];
    }

    const programs = yield* SagePrograms;
    const context = yield* getGameContext();
    const signer = yield* gameService.signer;
    const gameId = context.game.key;
    const gameState = context.game.data.gameState;
    const input: DepositCargoToFleetInput = { keyIndex: 0, amount: amountBN };
    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

    const cargoType = yield* getCargoTypeAddress(
      fuelMint,
      cargoStatsDefinition
    );

    const ix_1 = Fleet.withdrawCargoFromFleet(
      programs.sage,
      programs.cargo,
      signer,
      signer.publicKey(),
      playerProfilePubkey,
      profileFactionPubkey,
      starbasePubkey,
      starbasePlayerPubkey,
      fleetPubkey,
      fleetFuelTankPubkey,
      starbasePlayerCargoPodsPubkey,
      cargoType,
      cargoStatsDefinition,
      tokenAccountToPubkey,
      tokenAccountFromPubkey,
      fuelMint,
      gameId,
      gameState,
      input
    );

    return [ix_0, ix_1];
  });

//   // New
//   // TODO: improve error handling
export const createRearmFleetIx = (fleetPubkey: PublicKey, amount: number) =>
  Effect.gen(function* () {
    if (amount < 0) {
      return yield* Effect.fail(new InvalidAmountError());
    }

    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const fleetCargoStats = fleetAccount.data.stats.cargoStats as CargoStats;

    const ammoMint = resourceNameToMint.Ammunition;

    // Player Profile
    const playerProfilePubkey = fleetAccount.data.ownerProfile;
    const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfilePubkey
    );

    const profileFactionPubkey = yield* getProfileFactionAddress(
      playerProfilePubkey
    );

    // Starbase where the fleet is located
    const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;
    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    // PDA Starbase - Player
    const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
      starbasePubkey,
      sagePlayerProfilePubkey,
      starbaseAccount.data.seqId
    );

    // This PDA account is the owner of all player resource token accounts
    // in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
    const starbasePlayerCargoPodsAccount = yield* getCargoPodsByAuthority(
      starbasePlayerPubkey
    );

    const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;
    const gameService = yield* GameService;
    const maybeTokenAccountFrom = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(
        starbasePlayerCargoPodsPubkey
      ),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === ammoMint.toBase58())
        )
      )
    );

    if (isNone(maybeTokenAccountFrom)) {
      return yield* Effect.fail(
        new StarbaseCargoPodTokenAccountNotFoundError()
      );
    }

    const tokenAccountFromPubkey = maybeTokenAccountFrom.value.address;

    // This PDA account is the owner of all the resources
    // in the fleet's cargo (Fleet Cargo Holds - Stiva della flotta)
    const fleetAmmoBankPubkey = fleetAccount.data.ammoBank;
    const maybeTokenAccountTo = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(fleetAmmoBankPubkey),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === ammoMint.toBase58())
        )
      )
    );

    const tokenAccountToATA =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        ammoMint,
        fleetAmmoBankPubkey,
        true
      );

    const tokenAccountToPubkey = tokenAccountToATA.address;

    const ix_0 = tokenAccountToATA.instructions;

    // amount > fleet free capacity?
    let amountBN = BN.min(
      new BN(amount),
      isSome(maybeTokenAccountTo)
        ? new BN(fleetCargoStats.ammoCapacity).sub(
            new BN(maybeTokenAccountTo.value.amount)
          )
        : new BN(fleetCargoStats.ammoCapacity)
    );

    // amount > starbase amount?
    amountBN = BN.min(amountBN, new BN(maybeTokenAccountFrom.value.amount));

    if (amountBN <= 0) {
      return [ix_0];
    }

    const programs = yield* SagePrograms;
    const context = yield* getGameContext();
    const signer = yield* gameService.signer;
    const gameId = context.game.key;
    const gameState = context.game.data.gameState;
    const input: DepositCargoToFleetInput = { keyIndex: 0, amount: amountBN };
    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

    const cargoType = yield* getCargoTypeAddress(
      ammoMint,
      cargoStatsDefinition
    );

    const ix_1 = Fleet.depositCargoToFleet(
      programs.sage,
      programs.cargo,
      signer,
      playerProfilePubkey,
      profileFactionPubkey,
      signer.publicKey(),
      starbasePubkey,
      starbasePlayerPubkey,
      fleetPubkey,
      starbasePlayerCargoPodsPubkey,
      fleetAmmoBankPubkey,
      cargoType,
      cargoStatsDefinition,
      tokenAccountFromPubkey,
      tokenAccountToPubkey,
      ammoMint,
      gameId,
      gameState,
      input
    );

    return [ix_0, ix_1];
  });

class FleetAmmoBankTokenAccountNotFoundError extends Data.TaggedError(
  "FleetAmmoBankTokenAccountNotFoundError"
) {}

//   // New
//   // TODO: improve error handling
export const createUnloadAmmoBanksIx = (
  fleetPubkey: PublicKey,
  amount: number
) =>
  Effect.gen(function* () {
    if (amount < 0) {
      return yield* Effect.fail(new InvalidAmountError());
    }

    // Fleet data
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.StarbaseLoadingBay) {
      return yield* Effect.fail(new FleetNotInStarbaseError());
    }

    const ammoMint = resourceNameToMint.Ammunition;

    // Player Profile
    const playerProfilePubkey = fleetAccount.data.ownerProfile;

    const sagePlayerProfilePubkey = yield* getSagePlayerProfileAddress(
      fleetAccount.data.gameId,
      playerProfilePubkey
    );

    const profileFactionPubkey = yield* getProfileFactionAddress(
      playerProfilePubkey
    );

    // Starbase where the fleet is located
    const starbasePubkey = fleetAccount.state.StarbaseLoadingBay.starbase;
    const starbaseAccount = yield* getStarbaseAccount(starbasePubkey);

    // PDA Starbase - Player
    const starbasePlayerPubkey = yield* getStarbasePlayerAddress(
      starbasePubkey,
      sagePlayerProfilePubkey,
      starbaseAccount.data.seqId
    );

    // This PDA account is the owner of all player resource token accounts
    // in the starbase where the fleet is located (Starbase Cargo Pods - Deposito merci nella Starbase)
    const starbasePlayerCargoPodsAccount = yield* getCargoPodsByAuthority(
      starbasePlayerPubkey
    );

    const starbasePlayerCargoPodsPubkey = starbasePlayerCargoPodsAccount.key;

    const gameService = yield* GameService;
    const tokenAccountFromATA =
      yield* gameService.utils.createAssociatedTokenAccountIdempotent(
        ammoMint,
        starbasePlayerCargoPodsPubkey,
        true
      );

    const tokenAccountFromPubkey = tokenAccountFromATA.address;

    const ix_0 = tokenAccountFromATA.instructions;

    // This PDA account is the owner of all the resources in
    // the fleet's cargo (Fleet Cargo Holds - Stiva della flotta)
    const fleetAmmoBankPubkey = fleetAccount.data.ammoBank;

    const maybeTokenAccountTo = yield* pipe(
      gameService.utils.getParsedTokenAccountsByOwner(fleetAmmoBankPubkey),
      Effect.flatMap(
        Effect.findFirst((account) =>
          Effect.succeed(account.mint.toBase58() === ammoMint.toBase58())
        )
      )
    );

    if (isNone(maybeTokenAccountTo)) {
      return yield* Effect.fail(new FleetAmmoBankTokenAccountNotFoundError());
    }

    const tokenAccountToPubkey = maybeTokenAccountTo.value.address;

    const amountBN = BN.min(
      new BN(amount),
      new BN(maybeTokenAccountTo.value.amount)
    );

    if (amountBN <= 0) {
      return [ix_0];
    }

    const programs = yield* SagePrograms;

    const context = yield* getGameContext();
    const signer = yield* gameService.signer;
    const gameId = context.game.key;
    const gameState = context.game.data.gameState;
    const input: DepositCargoToFleetInput = { keyIndex: 0, amount: amountBN };
    const cargoStatsDefinition = context.game.data.cargo.statsDefinition;
    const cargoType = yield* getCargoTypeAddress(
      ammoMint,
      cargoStatsDefinition
    );

    const ix_1 = Fleet.withdrawCargoFromFleet(
      programs.sage,
      programs.cargo,
      signer,
      signer.publicKey(),
      playerProfilePubkey,
      profileFactionPubkey,
      starbasePubkey,
      starbasePlayerPubkey,
      fleetPubkey,
      fleetAmmoBankPubkey,
      starbasePlayerCargoPodsPubkey,
      cargoType,
      cargoStatsDefinition,
      tokenAccountToPubkey,
      tokenAccountFromPubkey,
      ammoMint,
      gameId,
      gameState,
      input
    );

    return [ix_0, ix_1];
  });

// export const createWarpToCoordinateIx = (
//   fleetPubkey: PublicKey,
//   coordinates: [BN, BN]
// ) =>
//   Effect.gen(function* () {
//     const fleetAccount = yield* getFleetAccount(fleetPubkey);

//     // TODO: ensure fleet state is "Idle" - is there a better way to do this?
//     if (!fleetAccount.state.Idle) {
//       yield* Effect.fail(new FleetNotIdleError());
//     }

//     const gameService = yield* GameService;
//     const solanaService = yield* SolanaService;
//     const context = yield* gameContext;

//     const gameFuelMint = context.game.data.mints.fuel;

//     const programs = yield* SagePrograms;
//     const signer = yield* gameService.signer;

//     const playerProfile = fleetAccount.data.ownerProfile;
//     const profileFaction = yield* getProfileFactionAddress(playerProfile);
//     const fleetKey = fleetPubkey;
//     const fleetFuelTank = fleetAccount.data.fuelTank;

//     const cargoStatsDefinition = context.game.data.cargo.statsDefinition;

//     const fuelCargoType = yield* getCargoTypeAddress(
//       gameFuelMint,
//       cargoStatsDefinition
//     );
//     const tokenMint = gameFuelMint;
//     const tokenFrom = yield* solanaService.getAssociatedTokenAddress(
//       tokenMint,
//       fleetFuelTank,
//       true
//     );

//     const gameState = context.game.data.gameState;
//     const gameId = context.game.key;

//     const input: WarpToCoordinateInput = {
//       keyIndex: 0, // FIXME: This is the index of the wallet used to sign the transaction in the permissions list of the player profile being used.
//       toSector: coordinates,
//     };

//     return Fleet.warpToCoordinate(
//       programs.sage,
//       signer,
//       playerProfile,
//       profileFaction,
//       fleetKey,
//       fleetFuelTank,
//       fuelCargoType,
//       cargoStatsDefinition,
//       tokenFrom,
//       tokenMint,
//       gameState,
//       gameId,
//       programs.cargo,
//       input
//     );
//   });

// export const createReadyToExitWarpIx = (fleetPubkey: PublicKey) =>
//   Effect.gen(function* () {
//     const program = yield* SagePrograms.sage;

//     return Fleet.moveWarpHandler(program, fleetPubkey);
//   });

export const getTimeToSubwarp = (
  fleetPubkey: PublicKey,
  coordinatesFrom: [BN, BN],
  coordinatesTo: [BN, BN]
) =>
  Effect.gen(function* () {
    const fleetAccount = yield* getFleetAccount(fleetPubkey);

    if (!fleetAccount.state.Idle) {
      yield* Effect.fail(new FleetNotIdleError());
    }

    const fleetStats = fleetAccount.data.stats as ShipStats;

    return Fleet.calculateSubwarpTimeWithCoords(
      fleetStats,
      coordinatesFrom,
      coordinatesTo
    );
  });

// export const createSubwarpToCoordinateIx = (
//   fleetPubkey: PublicKey,
//   coordinates: [BN, BN]
// ) =>
//   Effect.gen(function* () {
//     const fleetAccount = yield* getFleetAccount(fleetPubkey);

//     // TODO: ensure fleet state is "Idle" - is there a better way to do this?
//     if (!fleetAccount.state.Idle) {
//       yield* Effect.fail(new FleetNotIdleError());
//     }

//     const program = yield* SagePrograms.sage;
//     const gameService = yield* GameService;
//     const context = yield* gameContext;
//     const signer = yield* gameService.signer;

//     const playerProfile = fleetAccount.data.ownerProfile;
//     const profileFaction = yield* getProfileFactionAddress(playerProfile);
//     const fleetKey = fleetPubkey;
//     const gameState = context.game.data.gameState;
//     const gameId = context.game.key;

//     const input: StartSubwarpInput = {
//       // FIXME: This is the index of the wallet used to sign the
//       // transaction in the permissions list of the player profile being used.
//       keyIndex: 0,
//       toSector: coordinates,
//     };

//     return Fleet.startSubwarp(
//       program,
//       signer,
//       playerProfile,
//       profileFaction,
//       fleetKey,
//       gameId,
//       gameState,
//       input
//     );
//   });

// export const createReadyToExitSubwarpIx = (fleetPubkey: PublicKey) =>
//   Effect.gen(function* () {
//     const fleetAccount = yield* getFleetAccount(fleetPubkey);

//     const solanaService = yield* SolanaService;
//     const context = yield* gameContext;

//     const gameFuelMint = context.game.data.mints.fuel;

//     const program = yield* SagePrograms.sage;
//     const cargo = yield* SagePrograms.cargo;

//     const playerProfile = fleetAccount.data.ownerProfile;
//     const fleetKey = fleetPubkey;
//     const fleetFuelTank = fleetAccount.data.fuelTank;

//     const cargoStatsDefinition = context.game.data.cargo.statsDefinition;
//     const fuelCargoType = yield* getCargoTypeAddress(
//       gameFuelMint,
//       cargoStatsDefinition
//     );

//     const tokenMint = gameFuelMint;

//     const tokenFrom = yield* solanaService.getAssociatedTokenAddress(
//       tokenMint,
//       fleetFuelTank,
//       true
//     );

//     const gameState = context.game.data.gameState;
//     const gameId = context.game.key;

//     return Fleet.movementSubwarpHandler(
//       program,
//       cargo,
//       playerProfile,
//       fleetKey,
//       fleetFuelTank,
//       fuelCargoType,
//       cargoStatsDefinition,
//       tokenFrom,
//       tokenMint,
//       gameId,
//       gameState
//     );
//   });
