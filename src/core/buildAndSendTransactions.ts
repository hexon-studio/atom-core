import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, SendTransactionError } from "@solana/web3.js";
import {
  APTransactionBuilderConstructor,
  AtlasFeePayerIDL,
  AtlasPrimeTransactionBuilder,
  PostTransactionArgs,
} from "@staratlas/atlas-prime";
import {
  AsyncSigner,
  InstructionReturn,
  sendTransaction,
} from "@staratlas/data-source";
import { PlayerProfile, PlayerProfileIDL } from "@staratlas/player-profile";
import { tokenMints } from "../constants/tokens";
import { Program } from "@staratlas/anchor";
import { ProfileVaultIDL } from "@staratlas/profile-vault";

export const buildAndSendTransactions = async ({
  connection,
  ixs,
  vaultAuthority,
  keypair,
  playerProfile,
  playerProfileProgram,
  profileVaultProgram,
  atlasPrimeProgram,
}: {
  connection: Connection;
  keypair: AsyncSigner;
  ixs: InstructionReturn[];
  vaultAuthority: PublicKey;
  playerProfile: PlayerProfile;
  playerProfileProgram: Program<PlayerProfileIDL>;
  profileVaultProgram: Program<ProfileVaultIDL>;
  atlasPrimeProgram: Program<AtlasFeePayerIDL>;
}) => {
  const pta: PostTransactionArgs = {
    vault: {
      funderVaultAuthority: vaultAuthority,
      funderVault: getAssociatedTokenAddressSync(
        tokenMints.atlas,
        vaultAuthority,
        true
      ), // ATLAS ATA
      keyInput: {
        key: keypair,
        profile: playerProfile,
        playerProfileProgram,
      },
      vaultProgram: profileVaultProgram,
    },
  };

  const aptbc: APTransactionBuilderConstructor = {
    afpUrl: "https://prime.staratlas.com/",
    connection: connection,
    commitment: "confirmed",
    dummyKeys: this.dummyKeys,
    postArgs: pta,
    program: atlasPrimeProgram,
  };

  const aptb = new AtlasPrimeTransactionBuilder(aptbc);
  aptb.add(ixs);

  try {
    const tx = await aptb.buildNextOptimalTransaction();
    if (tx.isErr()) {
      throw tx.error;
    }

    const sim = await connection.simulateTransaction(tx.value.transaction);
    console.log("Error: ", sim.value.err);

    const sig = await sendTransaction(tx.value, connection, {
      sendOptions: { skipPreflight: true },
    });
    console.log(sig.value);

    console.log("Remaining: ", aptb.instructions.length);
  } catch (e) {
    if (e instanceof SendTransactionError) {
      const logs = await e.getLogs(connection);
      console.log(logs);
    }
    console.log(e);
  }
};
