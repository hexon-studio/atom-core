import { Effect } from "effect";
import { SagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";
import { ATLAS_DECIMALS, tokenMints } from "../../../constants/tokens";
import { ProfileVault } from "@staratlas/profile-vault";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "bn.js";
import type { InstructionReturn } from "@staratlas/data-source";
import type { PublicKey } from "@solana/web3.js";
import { NoInstructions } from "../../fleet/errors";

export const createDrainVaultIx = (
	ixs: InstructionReturn[],
	resourceMint?: PublicKey,
) =>
	Effect.gen(function* () {
		if (ixs.length === 0) {
			return yield* Effect.fail(new NoInstructions());
		}

		const [programs, context, signer] = yield* GameService.pipe(
			Effect.flatMap((service) =>
				Effect.all([SagePrograms, getGameContext(), service.signer]),
			),
		);

		const ixsFee = context.fees.defaultFee * ixs.length * ATLAS_DECIMALS;

		const mintFee = resourceMint
			? context.fees.mintFees.find((item) => item.mint.equals(resourceMint))
			: undefined;
		const miningFee = mintFee ? mintFee.fee * ATLAS_DECIMALS : 0;

		const estimatedFee = ixsFee + miningFee;
		const totalFee = estimatedFee < 10 * ATLAS_DECIMALS ? estimatedFee : 0;

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile,
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

		const drainVaultIx = ProfileVault.drainVault(
			programs.profileVaultProgram,
			vault,
			vaultAuthority,
			atlasTokenAccount,
			new BN(totalFee),
			{
				playerProfileProgram: programs.playerProfile,
				key: signer,
				profileKey: context.playerProfile,
				keyIndex: 3,
			},
		);

		return drainVaultIx;
	});
