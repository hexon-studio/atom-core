import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { BN } from "bn.js";
import { Effect } from "effect";
import { ATLAS_DECIMALS, tokenMints } from "../../../constants/tokens";

import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

export const createDrainVaultIx = (
	ixs: InstructionReturn[],
	resourceMint?: PublicKey,
) =>
	Effect.gen(function* () {
		if (!ixs.length) {
			return [];
		}

		const programs = yield* SagePrograms;

		const context = yield* getGameContext();

		const signer = yield* GameService.pipe(
			Effect.flatMap((service) => service.signer),
		);

		const ixsFee = context.fees.defaultFee * ixs.length * ATLAS_DECIMALS;

		const { fee: mintFee } = context.fees.mintFees.find(
			(item) => resourceMint && item.mint.equals(resourceMint),
		) ?? { fee: 0 };

		const miningFee = mintFee * ATLAS_DECIMALS;

		const estimatedFee = ixsFee + miningFee;

		const totalFee = estimatedFee < 10 * ATLAS_DECIMALS ? estimatedFee : 0;

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

		return [
			ProfileVault.drainVault(
				programs.profileVaultProgram,
				vault,
				vaultAuthority,
				atlasTokenAccount,
				new BN(totalFee),
				{
					playerProfileProgram: programs.playerProfile,
					key: signer,
					profileKey: context.playerProfile.key,
					keyIndex: context.keyIndexes.profileVault,
				},
			),
		];
	});
