import type { Keypair, PublicKey } from "@solana/web3.js";
import { type AsyncSigner, keypairToAsyncSigner } from "@staratlas/data-source";
import type { PlayerProfile } from "@staratlas/player-profile";
import { Effect, Layer, Option, Ref } from "effect";
import { type CreateKeypairError, SolanaService } from "../SolanaService";
import { type FindFleets, findFleets } from "./methods/findFleets";
import { type FindGame, findGame } from "./methods/findGame";
import { type FindPlanets, findAllPlanets } from "./methods/findPlanets";
import { type InitGame, initGame } from "./methods/initGame";
import type { Fees } from "./methods/initGame/fetchFees";
import type { GameInfo } from "./methods/initGame/fetchGameInfo";
import {
	type BuildAndSignTransaction,
	buildAndSignTransaction,
} from "./utils/buildAndSignTransaction";
import {
	type BuildAndSignTransactionWithAtlasPrime,
	buildAndSignTransactionWithAtlasPrime,
} from "./utils/buildAndSignTransactionWithAtlasPrime";
import {
	type CreateAssociatedTokenAccountIdempotent,
	createAssociatedTokenAccountIdempotent,
} from "./utils/createAssociatedTokenAccountIdempotent";
import {
	type GetParsedTokenAccountsByOwner,
	getParsedTokenAccountsByOwner,
} from "./utils/getParsedTokenAccountsByOwner";
import { type SendTransaction, sendTransaction } from "./utils/sendTransaction";

export interface GameContext {
	gameInfo: GameInfo;
	owner: PublicKey;
	playerProfile: PlayerProfile;
	keyIndexes: {
		sage: number;
		points: number;
		profileVault: number;
	};
	fees: Fees | null;
}

export class GameService extends Effect.Tag("app/GameService")<
	GameService,
	{
		gameContext: Ref.Ref<Option.Option<GameContext>>;
		signer: Effect.Effect<
			AsyncSigner<Keypair>,
			CreateKeypairError,
			SolanaService
		>;

		initGame: InitGame;
		findFleets: FindFleets;
		findGame: FindGame;
		findPlanets: FindPlanets;

		getParsedTokenAccountsByOwner: GetParsedTokenAccountsByOwner;
		createAssociatedTokenAccountIdempotent: CreateAssociatedTokenAccountIdempotent;
		buildAndSignTransaction: BuildAndSignTransaction;
		buildAndSignTransactionWithAtlasPrime: BuildAndSignTransactionWithAtlasPrime;
		sendTransaction: SendTransaction;
	}
>() {}

const gameContextRef = Ref.unsafeMake(Option.none<GameContext>());

export const GameServiceLive = Layer.effect(
	GameService,
	Effect.map(SolanaService, () =>
		GameService.of({
			gameContext: gameContextRef,
			initGame,
			findFleets,
			findPlanets: findAllPlanets,
			findGame,
			signer: SolanaService.pipe(
				Effect.map((service) => keypairToAsyncSigner(service.signer)),
			),
			buildAndSignTransaction,
			buildAndSignTransactionWithAtlasPrime,
			getParsedTokenAccountsByOwner,
			createAssociatedTokenAccountIdempotent,
			sendTransaction,
		}),
	),
);
