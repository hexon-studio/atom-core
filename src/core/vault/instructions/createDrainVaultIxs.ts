import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { ProfileVault } from "@staratlas/profile-vault";
import { BN } from "bn.js";
import { Effect, Array as EffectArray, Match } from "effect";
import { ATLAS_DECIMALS, tokenMints } from "../../../constants/tokens";
import { getSagePrograms } from "../../programs";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

const maxFee = 1 * ATLAS_DECIMALS;

export const createDrainVaultIxs = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		const feesOptions = context.options.fees;

		if (!feesOptions) {
			return [];
		}

		const signer = yield* GameService.signer;

		return Match.value(feesOptions).pipe(
			Match.when({ type: "atlas-prime" }, ({ atlas, recipient }) => {
				const fee = Math.min(atlas, maxFee);

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
					recipient,
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
			}),
			Match.when({ type: "sol" }, ({ lamports, recipient }) => {
				return [
					async () => ({
						signers: [signer],
						instruction: SystemProgram.transfer({
							fromPubkey: signer.publicKey(),
							toPubkey: recipient,
							lamports,
						}),
					}),
				] satisfies InstructionReturn[];
			}),
			Match.orElse(EffectArray.empty<InstructionReturn>),
		);
	});
