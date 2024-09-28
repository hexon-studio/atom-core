import { Keypair, PublicKey } from "@solana/web3.js";
import { AsyncSigner, keypairToAsyncSigner } from "@staratlas/data-source";
import { Game } from "@staratlas/sage";
import { Context, Effect, Layer, Option, SynchronizedRef } from "effect";
import { CreateKeypairError, SolanaService } from "../SolanaService";
import { FindFleets, findFleets } from "./methods/findFleets";
import { FindGame, findGame } from "./methods/findGame";
import { FindPlanets, findPlanets } from "./methods/findPlanets";
import { InitGame, initGame } from "./methods/initGame";
import {
  BuildAndSignTransaction,
  buildAndSignTransaction,
} from "./utils/buildAndSignTransaction";
import {
  BuildAndSignTransactionWithAtlasPrime,
  buildAndSignTransactionWithAtlasPrime,
} from "./utils/buildAndSignTransactionWithAtlasPrime";
import {
  CreateAssociatedTokenAccountIdempotent,
  createAssociatedTokenAccountIdempotent,
} from "./utils/createAssociatedTokenAccountIdempotent";
import {
  GetParsedTokenAccountsByOwner,
  getParsedTokenAccountsByOwner,
} from "./utils/getParsedTokenAccountsByOwner";
import { SendTransaction, sendTransaction } from "./utils/sendTransaction";

export interface GameContext {
  game: Game;
  owner: PublicKey;
  playerProfile: PublicKey;
  planetsLookup: Record<string, PublicKey>;
}

export class GameService extends Context.Tag("app/GameService")<
  GameService,
  {
    context: SynchronizedRef.SynchronizedRef<Option.Option<GameContext>>;
    signer: Effect.Effect<
      AsyncSigner<Keypair>,
      CreateKeypairError,
      SolanaService
    >;
    methods: {
      initGame: InitGame;
      findFleets: FindFleets;
      findGame: FindGame;
      findPlanets: FindPlanets;
    };
    utils: {
      getParsedTokenAccountsByOwner: GetParsedTokenAccountsByOwner;
      createAssociatedTokenAccountIdempotent: CreateAssociatedTokenAccountIdempotent;
      buildAndSignTransaction: BuildAndSignTransaction;
      buildAndSignTransactionWithAtlasPrime: BuildAndSignTransactionWithAtlasPrime;
      sendTransaction: SendTransaction;
    };
  }
>() {}

const gameContextRef = SynchronizedRef.unsafeMake(Option.none<GameContext>());

export const GameServiceLive = Layer.effect(
  GameService,
  Effect.map(SolanaService, () =>
    GameService.of({
      context: gameContextRef,
      methods: {
        initGame,
        findFleets,
        findPlanets,
        findGame,
      },
      signer: SolanaService.pipe(
        Effect.map((service) => keypairToAsyncSigner(service.signer))
      ),
      utils: {
        buildAndSignTransaction,
        buildAndSignTransactionWithAtlasPrime,
        getParsedTokenAccountsByOwner,
        createAssociatedTokenAccountIdempotent,
        sendTransaction,
      },
    })
  )
);
