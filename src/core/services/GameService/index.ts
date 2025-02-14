import type { Keypair } from "@solana/web3.js";
import { type AsyncSigner, keypairToAsyncSigner } from "@staratlas/data-source";
import type { PlayerProfile } from "@staratlas/player-profile";
import { Effect, Layer, Option, Ref } from "effect";
import type { GlobalOptions } from "~/types";
import { SolanaService } from "../SolanaService";
import { type FindGame, findGame } from "./methods/findGame";
import { type FindPlanets, findAllPlanets } from "./methods/findPlanets";
import { type InitGame, initGame } from "./methods/initGame";
import type { GameInfo } from "./methods/initGame/fetchGameInfo";
import {
	type BuildAndSignTransaction,
	createBuildAndSignTransaction,
} from "./utils/buildAndSignTransaction";

import { type SendTransaction, sendTransaction } from "./utils/sendTransaction";

export interface GameContext {
	options: GlobalOptions;
	gameInfo: GameInfo;
	playerProfile: PlayerProfile;
	keyIndexes: {
		sage: number;
		points: number;
		profileVault: number;
	};
}

export class GameService extends Effect.Tag("app/GameService")<
	GameService,
	{
		gameContext: Ref.Ref<Option.Option<GameContext>>;
		signer: Effect.Effect<AsyncSigner<Keypair>, never, SolanaService>;

		initGame: InitGame;
		findGame: FindGame;
		findPlanets: FindPlanets;

		buildAndSignTransaction: BuildAndSignTransaction;
		sendTransaction: SendTransaction;
	}
>() {}

const gameContextRef = Ref.unsafeMake(Option.none<GameContext>());

export const createGameServiceLive = (withAtlasPrime: boolean) =>
	Layer.effect(
		GameService,
		Effect.map(SolanaService, () =>
			GameService.of({
				gameContext: gameContextRef,
				initGame,
				findPlanets: findAllPlanets,
				findGame,
				signer: SolanaService.pipe(
					Effect.map((service) => keypairToAsyncSigner(service.signer)),
				),
				buildAndSignTransaction: createBuildAndSignTransaction(withAtlasPrime),

				sendTransaction,
			}),
		),
	);
