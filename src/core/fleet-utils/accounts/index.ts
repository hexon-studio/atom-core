import { PublicKey, TransactionConfirmationStatus } from "@solana/web3.js";
import { Idl, Program } from "@staratlas/anchor";
import { CargoPod, CargoType } from "@staratlas/cargo";
import {
  Account,
  AccountStatic,
  readFromRPCOrError,
} from "@staratlas/data-source";
import {
  Fleet,
  Game,
  MineItem,
  Planet,
  Resource,
  Sector,
  Starbase,
} from "@staratlas/sage";
import { Data, Effect } from "effect";
import { SagePrograms } from "../../programs";

class ReadFromRPCError extends Data.TaggedError("readFromRPCError")<{
  readonly error: unknown;
  readonly accountName: string;
}> {
  toString() {
    return `Error reading: ${this.accountName}, from RPC: ${this.error}`;
  }
}

export const readFromSage = <A extends Account, IDL extends Idl>(
  program: Program<IDL>,
  resourceKey: PublicKey,
  resourceType: AccountStatic<A, IDL>,
  commitment: TransactionConfirmationStatus = "confirmed"
) =>
  Effect.tryPromise({
    try: () =>
      readFromRPCOrError(
        program.provider.connection,
        program,
        resourceKey,
        resourceType,
        commitment
      ),
    catch: (error) =>
      new ReadFromRPCError({
        error,
        accountName: resourceType.ACCOUNT_NAME,
      }),
  });

export const getGameAccount = (gamePublicKey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, gamePublicKey, Game)
    )
  );

export const getFleetAccount = (fleetPubkey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, fleetPubkey, Fleet)
    )
  );

export const getMineItemAccount = (mineItemPubkey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, mineItemPubkey, MineItem)
    )
  );

export const getPlanetAccount = (planetPubkey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, planetPubkey, Planet)
    )
  );

export const getResourceAccount = (resourcePubkey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, resourcePubkey, Resource)
    )
  );

export const getSectorAccount = (sectorPubkey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, sectorPubkey, Sector)
    )
  );

export const getStarbaseAccount = (starbasePubkey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.sage, starbasePubkey, Starbase)
    )
  );

export const getCargoPodAccount = (cargoPodPublicKey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.cargo, cargoPodPublicKey, CargoPod)
    )
  );

export const getCargoTypeAccount = (cargoTypePublicKey: PublicKey) =>
  SagePrograms.pipe(
    Effect.flatMap((programs) =>
      readFromSage(programs.cargo, cargoTypePublicKey, CargoType)
    )
  );
