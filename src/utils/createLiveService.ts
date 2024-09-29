import { Keypair } from "@solana/web3.js";
import { Layer } from "effect";
import { createSolanaServiceLive } from "../core/services/SolanaService";
import { GameServiceLive } from "../core/services/GameService";

export const createMainLiveService = ({
  keypair,
  rpcUrl,
}: {
  rpcUrl: string;
  keypair: Keypair;
}) => {
  const SolanaServiceLive = createSolanaServiceLive({ rpcUrl, keypair });

  return Layer.mergeAll(
    SolanaServiceLive,
    GameServiceLive.pipe(Layer.provide(SolanaServiceLive))
  );
};
