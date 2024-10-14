import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Console, Data, Effect, Match, pipe } from "effect";
import type { CargoPodKind } from "../../types";
import { isPublicKey } from "../../utils/public-key";
import {
	createDepositCargoToFleetIx,
	createDockToStarbaseIx,
	createStopMiningIx,
} from "../fleet/instructions";
import { GameService } from "../services/GameService";
import {
	getFleetAccount,
	getMineItemAccount,
	getResourceAccount,
} from "../utils/accounts";
import { getFleetAddressByName } from "../utils/pdas";
import { createDrainVaultIx } from "../vault/instructions/createDrainVaultIx";

export class BuildOptinalTxError extends Data.TaggedError(
	"BuildOptinalTxError",
)<{ error: unknown }> {
	override get message() {
		return String(this.error);
	}
}

export const loadCargo = ({
	amount,
	fleetNameOrAddress,
	resourceMint,
	cargoPodKind,
}: {
	amount: number;
	fleetNameOrAddress: string | PublicKey;
	resourceMint: PublicKey;
	cargoPodKind: CargoPodKind;
}) =>
	Effect.gen(function* () {
		const fleetAddress = yield* isPublicKey(fleetNameOrAddress)
			? Effect.succeed(fleetNameOrAddress)
			: getFleetAddressByName(fleetNameOrAddress);

		yield* Console.log(
			`Loading cargo to fleet ${fleetNameOrAddress.toString()}`,
		);

		const fleetAccount = yield* getFleetAccount(fleetAddress);

		// TODO: nothing to load

		const ixs: InstructionReturn[] = [];

		const preIxs = yield* Match.value(fleetAccount.state).pipe(
			Match.whenOr(
				{ Idle: Match.defined },
				{ MoveWarp: Match.defined },
				{ MoveSubwarp: Match.defined },
				() => createDockToStarbaseIx(fleetAccount),
			),
			Match.when(
				{ MineAsteroid: Match.defined },
				({ MineAsteroid: { resource } }) =>
					Effect.Do.pipe(
						Effect.bind("stopMiningIx", () =>
							pipe(
								getResourceAccount(resource),
								Effect.flatMap((resource) =>
									getMineItemAccount(resource.data.mineItem),
								),
								Effect.flatMap((mineItem) =>
									createStopMiningIx({
										resourceMint: mineItem.data.mint,
										fleetAccount,
									}),
								),
							),
						),
						Effect.bind("dockIx", () => createDockToStarbaseIx(fleetAccount)),
						Effect.map(({ stopMiningIx, dockIx }) => [
							...stopMiningIx,
							...dockIx,
						]),
					),
			),
			Match.orElse(() => Effect.succeed([])),
		);

		ixs.push(...preIxs);

		const loadCargoIxs = yield* createDepositCargoToFleetIx({
			amount,
			fleetAddress,
			resourceMint,
			cargoPodKind,
		});

		ixs.push(...loadCargoIxs);

		const gameService = yield* GameService;

		const drainVaultIx = yield* createDrainVaultIx(ixs);

		ixs.push(drainVaultIx);

		const txs =
			yield* gameService.utils.buildAndSignTransactionWithAtlasPrime(ixs);

		const txIds = yield* Effect.all(
			txs.map((tx) => gameService.utils.sendTransaction(tx)),
		);

		yield* Console.log("Fleet cargo loaded!");

		return txIds;
	});
