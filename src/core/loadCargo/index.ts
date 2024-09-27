import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN, Wallet } from "@staratlas/anchor";
import { CargoType } from "@staratlas/cargo";
import {
  createAssociatedTokenAccountIdempotent,
  InstructionReturn,
  keypairToAsyncSigner,
  readFromRPCOrError,
} from "@staratlas/data-source";
import { ProfileFactionAccount } from "@staratlas/profile-faction";
import {
  Fleet,
  Game,
  getCargoPodsByAuthority,
  SagePlayerProfile,
  Starbase,
  StarbasePlayer,
} from "@staratlas/sage";
import { programIds } from "../../constants/programs";
import { ResourceMint } from "../../constants/resources";
import { CargoPodKind, RequiredParam } from "../../types";
import { loadPrograms } from "../loadPrograms";
type Param = RequiredParam & {
  starbaseAddress: PublicKey;
  fleetAddress: PublicKey;
  minResources: Array<[ResourceMint, number, CargoPodKind]>;
};

export const loadCargo = async ({
  keypair,
  starbaseAddress,
  fleetAddress,
  playerProfile,
  minResources,
  rpcUrl,
}: Param) => {
  const connection = new Connection(rpcUrl);

  const provider = new AnchorProvider(
    connection,
    new Wallet(keypair),
    AnchorProvider.defaultOptions()
  );
  const asyncSigner = keypairToAsyncSigner(keypair);

  const programs = loadPrograms(provider);

  const game: Game = await readFromRPCOrError(
    connection,
    programs.sageProgram,
    programIds.gameId,
    Game,
    "confirmed"
  );

  const [profileFaction] = ProfileFactionAccount.findAddress(
    programs.profileFactionProgram,
    playerProfile
  );

  const [sagePlayerProfile] = SagePlayerProfile.findAddress(
    programs.sageProgram,
    playerProfile,
    programIds.gameId
  );

  const starbaseAccount = await readFromRPCOrError(
    connection,
    programs.sageProgram,
    starbaseAddress,
    Starbase
  );

  const fleetAccount = await readFromRPCOrError(
    connection,
    programs.sageProgram,
    fleetAddress,
    Fleet
  );

  const [starbasePlayer] = StarbasePlayer.findAddress(
    programs.sageProgram,
    starbaseAddress,
    sagePlayerProfile,
    starbaseAccount.data.seqId
  );

  const [starbasePlayerPod] = await getCargoPodsByAuthority(
    connection,
    programs.cargoProgram,
    starbasePlayer
  );

  if (!starbasePlayerPod) {
    throw new Error("Starbase player pod not found");
  }

  const ixs: InstructionReturn[] = [];

  for (const [resourceMintString, minAmount, cargoType] of minResources) {
    const resourceMint = new PublicKey(resourceMintString);

    const [cargoTypePda] = CargoType.findAddress(
      programs.cargoProgram,
      game.data.cargo.statsDefinition,
      resourceMint,
      1
    );

    const cargoType = await readFromRPCOrError(
      connection,
      programs.cargoProgram,
      cargoTypePda,
      CargoType,
      "confirmed"
    );

    const ixFleetCargoHoldMintAta =
      await createAssociatedTokenAccountIdempotent(
        resourceMint,
        fleetAccount.data.cargoHold,
        true
      );

    const starbasePodMintAta = getAssociatedTokenAddressSync(
      starbasePlayerPod.key,
      resourceMint
    );

    const ix = Fleet.depositCargoToFleet(
      programs.sageProgram,
      programs.cargoProgram,
      asyncSigner,
      playerProfile,
      profileFaction,
      "funder",
      starbaseAddress,
      starbasePlayer,
      fleetAddress,
      starbasePlayerPod.key,
      fleetAccount.data.cargoHold,
      cargoType.key,
      game.data.cargo.statsDefinition,
      starbasePodMintAta,
      ixFleetCargoHoldMintAta.address,
      resourceMint,
      programIds.gameId,
      game.data.gameState,
      {
        keyIndex: 1,
        amount: BN(0),
      }
    );

    ixs.push(ix);
  }

  // Send tx with ixs
};
