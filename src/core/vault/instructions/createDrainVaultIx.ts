import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
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

		const signer = yield* GameService.signer;

		if (!context.options.atlasPrime) {
			return [
				async () => ({
					signers: [signer],
					instruction: SystemProgram.transfer({
						fromPubkey: signer.publicKey(),
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						toPubkey: context.fees!.feeAddress!,
						// biome-ignore lint/style/noNonNullAssertion: <explanation>
						lamports: context.fees!.defaultFeeSol * LAMPORTS_PER_SOL,
					}),
				}),
			] satisfies InstructionReturn[];
		}

		const maybeFee = context.fees.defaultFee * ATLAS_DECIMALS;

		if (!maybeFee || maybeFee <= 0) {
			return [];
		}

		const fee = maybeFee < maxFee ? maybeFee : maxFee;

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile.key,
			context.options.owner,
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
