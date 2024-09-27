import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, SendTransactionError } from "@solana/web3.js";
import {
  APTransactionBuilderConstructor,
  AtlasPrimeTransactionBuilder,
  PostTransactionArgs,
} from "@staratlas/atlas-prime";
import {
  AsyncSigner,
  InstructionReturn,
  sendTransaction,
} from "@staratlas/data-source";
import { PlayerProfile } from "@staratlas/player-profile";
import { tokenMints } from "../constants/tokens";

export const buildAndSendTransactions = async ({
  connection,
  ixs,
  vaultAuthority,
  keypair,
  playerProfile,
}: {
  connection: Connection;
  keypair: AsyncSigner;
  ixs: InstructionReturn[];
  vaultAuthority: PublicKey;
  playerProfile: PlayerProfile;
  playerProfileProgram: PublicKey;
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
        key: keypair.publicKey(),
        profile: playerProfile,
        playerProfileProgram,
      },
      vaultProgram: this.programs.profileVaultProgram,
    },
  };

  const aptbc: APTransactionBuilderConstructor = {
    afpUrl: "https://prime.staratlas.com/",
    connection: this.provider.connection,
    commitment: "confirmed",
    dummyKeys: this.dummyKeys,
    postArgs: pta,
    program: this.programs.atlasPrimeProgram,
  };

  const aptb = new AtlasPrimeTransactionBuilder(aptbc);
  aptb.add(ixs);

  try {
    const tx = await aptb.buildNextOptimalTransaction();
    if (tx.isErr()) {
      throw tx.error;
    }

    const sim = await this.provider.connection.simulateTransaction(
      tx.value.transaction
    );
    console.log("Error: ", sim.value.err);

    const sig = await sendTransaction(tx.value, this.provider.connection, {
      sendOptions: { skipPreflight: true },
    });
    console.log(sig.value);

    console.log("Remaining: ", aptb.ixs.length);
  } catch (e) {
    if (e instanceof SendTransactionError) {
      const logs = await e.getLogs(this.provider.connection);
      console.log(logs);
    }
    console.log(e);
  }
};
