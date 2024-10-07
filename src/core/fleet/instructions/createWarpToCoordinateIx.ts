import { Fleet } from "@staratlas/sage";
import { Effect } from "effect";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { getFleetAccount } from "../../utils/accounts";
import { getProfileFactionAddress } from "../../utils/pdas";
import { FleetNotIdleError } from "../errors";
import type BN from "bn.js";
import type { PublicKey } from "@solana/web3.js";
import { resourceNameToMint } from "../../../constants/resources";

type Param = {
	fleetAddress: PublicKey;
	toSector: [BN, BN];
};

export const createWarpToCoordinateIx = ({ fleetAddress, toSector }: Param) =>
	Effect.gen(function* () {
		const fleetAccount = yield* getFleetAccount(fleetAddress);

		if (!fleetAccount.state.Idle) {
			return yield* Effect.fail(new FleetNotIdleError());
		}

		const gameService = yield* GameService;

		const [programs, context, signer] = yield* GameService.pipe(
			Effect.flatMap((service) =>
				Effect.all([SagePrograms, getGameContext(), service.signer]),
			),
		);

		const ixs = [];

		const { address: fuelFuelBankAta, instructions: fuelIxs } =
			yield* gameService.utils.createAssociatedTokenAccountIdempotent(
				resourceNameToMint.Ammunition,
				fleetAccount.data.ammoBank,
				true,
			);

		ixs.push(fuelIxs);

		const playerFactionAddress = yield* getProfileFactionAddress(
			fleetAccount.data.ownerProfile,
		);

		return Fleet.warpToCoordinate(
			programs.sage,
			signer,
			fleetAccount.data.ownerProfile,
			playerFactionAddress,
			fleetAccount.key,
			fleetAccount.data.fuelTank,
			fuelTankInfo.resources[0]?.cargoTypeKey,
			context.cargoStatsDefinition.key,
			fuelTankInfo.resources[0]?.tokenAccountKey,
			resourceNameToMint.Fuel,
			context.gameState.key,
			context.game.key,
			programs.cargo,
			{ keyIndex: 1, toSector }, // 0 - normal wallet, 1 - hot wallet
		);
	});
