import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@staratlas/anchor";
import { keypairToAsyncSigner } from "@staratlas/data-source";
import type { Fleet } from "@staratlas/sage";
import { Effect, Exit, Layer, Option, Ref } from "effect";
import { constant, unsafeCoerce } from "effect/Function";
import mock from "mock-fs";
import { createDepositCargoToFleetIx } from ".";
import { resourceNameToMint } from "../../../../constants/resources";
import type { CargoPodKind } from "../../../../types";
import { type GameContext, GameService } from "../../../services/GameService";
import { findFleets } from "../../../services/GameService/methods/findFleets";
import { findGame } from "../../../services/GameService/methods/findGame";
import { findAllPlanets } from "../../../services/GameService/methods/findPlanets";
import { initGame } from "../../../services/GameService/methods/initGame";
import type { GameInfo } from "../../../services/GameService/methods/initGame/fetchGameInfo";
import { SolanaService } from "../../../services/SolanaService";
import { getFleetAccount } from "../../../utils/accounts";
import {
	FleetNotInStarbaseError,
	InvalidAmountError,
	InvalidResourceForPodKind,
} from "../../errors";

vi.mock("../../accounts");

const gameContextRef = Ref.unsafeMake(
	Option.some<GameContext>({
		gameInfo: {} as GameInfo,
		owner: new PublicKey("11111111111111111111111111111111"),
		playerProfile: new PublicKey("11111111111111111111111111111111"),
	}),
);

const createMockedSolanaService = (signer: Keypair) =>
	Layer.succeed(
		SolanaService,
		SolanaService.of({
			anchorProvider: Effect.succeed(AnchorProvider.env()),
			signer,
		}),
	);

const MockedGameService = Layer.effect(
	GameService,
	Effect.map(SolanaService, () =>
		GameService.of({
			context: gameContextRef,
			methods: {
				initGame,
				findFleets,
				findPlanets: findAllPlanets,
				findGame,
			},
			signer: SolanaService.pipe(
				Effect.map((service) => keypairToAsyncSigner(service.signer)),
			),
			utils: {
				buildAndSignTransaction: constant(Effect.succeed(unsafeCoerce([]))),
				buildAndSignTransactionWithAtlasPrime: constant(
					Effect.succeed(unsafeCoerce([])),
				),
				getParsedTokenAccountsByOwner: constant(
					Effect.succeed(unsafeCoerce([])),
				),
				createAssociatedTokenAccountIdempotent: constant(
					Effect.succeed(unsafeCoerce({})),
				),
				sendTransaction: constant(Effect.succeed("")),
			},
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

		const program = createDepositCargoToFleetIx({
			amount: 0,
			cargoPodKind: "ammo_bank",
			fleetAddress: new PublicKey("11111111111111111111111111111111"),
			resourceMint: resourceNameToMint.Carbon,
		}).pipe(Effect.provide(mainLive));

		const result = await Effect.runPromiseExit(program);

		expect(result).toStrictEqual(
			Exit.fail(
				new InvalidAmountError({
					amount: 0,
					resourceMint: resourceNameToMint.Carbon,
				}),
			),
		);
	});

	it.each([
		["ammo_bank", resourceNameToMint.Carbon.toString()],
		["fuel_tank", resourceNameToMint.Carbon.toString()],
	] satisfies [CargoPodKind, string][])(
		"returns InvalidResourceForPodKind error if the resourceMint does not match the cargo type: %s, %s",
		async (cargoPodKind, resourceMint) => {
			const mainLive = createMockServiceLive(signer);

			const program = createDepositCargoToFleetIx({
				amount: 1,
				cargoPodKind,
				fleetAddress: new PublicKey("11111111111111111111111111111111"),
				resourceMint: new PublicKey(resourceMint),
			}).pipe(Effect.provide(mainLive));

			const result = await Effect.runPromiseExit(program);

			expect(result).toStrictEqual(Exit.fail(new InvalidResourceForPodKind()));
		},
	);

	it("returns FleetNotInStarbaseError if the fleet is not docked in a starbase", async () => {
		vi.mocked(getFleetAccount).mockReturnValue(
			// Fake mining fleet
			Effect.succeed({ state: { MineAsteroid: {} } } as Fleet),
		);

		const mainLive = createMockServiceLive(signer);

		const program = createDepositCargoToFleetIx({
			amount: 1,
			cargoPodKind: "ammo_bank",
			fleetAddress: new PublicKey("11111111111111111111111111111111"),
			resourceMint: resourceNameToMint.Ammunition,
		}).pipe(Effect.provide(mainLive));

		const result = await Effect.runPromiseExit(program);

		expect(result).toStrictEqual(Exit.fail(new FleetNotInStarbaseError()));
	});
});
