import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@staratlas/anchor";
import { keypairToAsyncSigner } from "@staratlas/data-source";
import type { PlayerProfile } from "@staratlas/player-profile";
import type { Fleet } from "@staratlas/sage";
import { BN } from "bn.js";
import { Effect, Exit, Layer, ManagedRuntime, Option, Ref } from "effect";
import { constant, unsafeCoerce } from "effect/Function";
import mock from "mock-fs";
import { findAllPlanets } from "~/core/services/GameService/methods/findPlanets";
import type { GlobalOptions } from "~/types";
import { resourceMintByName } from "~/utils";
import { createDepositCargoToFleetIx } from ".";
import { noopPublicKey } from "../../../../constants/tokens";
import {
	FleetInvalidResourceForPodKindError,
	InvalidAmountError,
} from "../../../../errors";
import type { CargoPodKind } from "../../../../utils/decoders";
import { type GameContext, GameService } from "../../../services/GameService";
import { findGame } from "../../../services/GameService/methods/findGame";
import { initGame } from "../../../services/GameService/methods/initGame";
import type { GameInfo } from "../../../services/GameService/methods/initGame/fetchGameInfo";
import { SolanaService } from "../../../services/SolanaService";

vi.mock("../../../utils/accounts");

const gameContextRef = Ref.unsafeMake(
	Option.some<GameContext>({
		options: {
			atlasPrime: false,
			owner: noopPublicKey,
		} as GlobalOptions,
		gameInfo: {} as GameInfo,
		playerProfile: {} as PlayerProfile,
		keyIndexes: {
			points: 0,
			profileVault: 0,
			sage: 0,
		},
	}),
);

const createMockedSolanaService = (signer: Keypair) =>
	Layer.succeed(
		SolanaService,
		SolanaService.of({
			anchorProvider: AnchorProvider.env(),
			signer,
			getParsedTokenAccountsByOwner: constant(Effect.succeed(unsafeCoerce([]))),
			createAssociatedTokenAccountIdempotent: constant(
				Effect.succeed(unsafeCoerce({})),
			),
		}),
	);

const MockedGameService = Layer.effect(
	GameService,
	Effect.map(SolanaService, () =>
		GameService.of({
			gameContext: gameContextRef,
			initGame,
			findGame,
			findPlanets: findAllPlanets,
			signer: SolanaService.signer.pipe(Effect.map(keypairToAsyncSigner)),
			buildAndSignTransaction: constant(Effect.succeed(unsafeCoerce([]))),
			sendTransaction: constant(Effect.succeed("")),
		}),
	),
);

const createMockServiceLive = (signer: Keypair = Keypair.generate()) => {
	const mockedSolanaServiceLive = createMockedSolanaService(signer);

	return Layer.mergeAll(
		mockedSolanaServiceLive,
		MockedGameService.pipe(Layer.provide(mockedSolanaServiceLive)),
	);
};

const signer = Keypair.generate();

describe("createDepositCargoToFleetIx", () => {
	beforeAll(() => {
		vi.stubEnv("ANCHOR_PROVIDER_URL", "https://api.mainnet-beta.solana.com");
		vi.stubEnv("ANCHOR_WALLET", "some/file");

		mock({
			"some/file": `[${signer.secretKey.toString()}]`,
		});
	});

	afterAll(() => {
		mock.restore();
	});

	it("returns an InvalidAmountError if the amount is less than or equal to 0", async () => {
		const mainLive = createMockServiceLive(signer);

		const runtime = ManagedRuntime.make(mainLive);

		const program = createDepositCargoToFleetIx({
			starbaseInfo: {
				starbasePlayerCargoPodsAccountPubkey: PublicKey.default,
				sagePlayerProfilePubkey: PublicKey.default,
				starbasePlayerPubkey: PublicKey.default,
				starbasePubkey: PublicKey.default,
			},
			cargoPodPublicKey: PublicKey.default,
			item: {
				amount: new BN(0),
				cargoPodKind: "ammo_bank",
				resourceMint: resourceMintByName("Carbon"),
				starbaseResourceTokenAccount: PublicKey.default,
			},
			fleetAccount: {} as Fleet,
		});

		const result = await runtime.runPromiseExit(program);

		expect(result).toStrictEqual(
			Exit.fail(
				new InvalidAmountError({
					amount: "0",
					resourceMint: resourceMintByName("Carbon"),
				}),
			),
		);
	});

	it.each([
		["ammo_bank", resourceMintByName("Carbon").toString()],
		["fuel_tank", resourceMintByName("Carbon").toString()],
	] satisfies [CargoPodKind, string][])(
		"returns InvalidResourceForPodKind error if the resourceMint does not match the cargo type: %s, %s",
		async (cargoPodKind, resourceMint) => {
			const mainLive = createMockServiceLive(signer);

			const runtime = ManagedRuntime.make(mainLive);

			const program = createDepositCargoToFleetIx({
				starbaseInfo: {
					starbasePlayerCargoPodsAccountPubkey: PublicKey.default,
					sagePlayerProfilePubkey: PublicKey.default,
					starbasePlayerPubkey: PublicKey.default,
					starbasePubkey: PublicKey.default,
				},
				cargoPodPublicKey: PublicKey.default,
				item: {
					starbaseResourceTokenAccount: PublicKey.default,
					amount: new BN(1),
					cargoPodKind,
					resourceMint: new PublicKey(resourceMint),
				},
				fleetAccount: {} as Fleet,
			});

			const result = await runtime.runPromiseExit(program);

			expect(result).toStrictEqual(
				Exit.fail(
					new FleetInvalidResourceForPodKindError({
						cargoPodKind,
						resourceMint: new PublicKey(resourceMint),
					}),
				),
			);
		},
	);
});
