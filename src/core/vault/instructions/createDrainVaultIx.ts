import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ProfileVault } from "@staratlas/profile-vault";
import { BN } from "bn.js";
import { Effect } from "effect";
import { ATLAS_DECIMALS, tokenMints } from "../../../constants/tokens";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

const maxFee = 1 * ATLAS_DECIMALS;

export const createDrainVaultIx = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		if (!context.fees?.feeAddress) {
			return [];
		}

		const maybeFee = context.fees.defaultFee * ATLAS_DECIMALS;

		if (!maybeFee || maybeFee <= 0) {
			return [];
		}

		const fee = maybeFee < maxFee ? maybeFee : maxFee;

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile.key,
			context.owner,
		);

		const vault = getAssociatedTokenAddressSync(
			tokenMints.atlas,
			vaultAuthority,
			true,
		);

		const atlasTokenAccount = getAssociatedTokenAddressSync(
			tokenMints.atlas,
			context.fees.feeAddress,
			true,
		);

		const signer = yield* GameService.pipe(
			Effect.flatMap((service) => service.signer),
		);

		return [
			ProfileVault.drainVault(
				programs.profileVaultProgram,
				vault,
				vaultAuthority,
				atlasTokenAccount,
				new BN(fee),
				{
					playerProfileProgram: programs.playerProfile,
					key: signer,
					profileKey: context.playerProfile.key,
					keyIndex: context.keyIndexes.profileVault,
				},
			),
		];
	});
