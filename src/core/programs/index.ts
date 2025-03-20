import { PublicKey } from "@solana/web3.js";
import { Program } from "@staratlas/anchor";
import { ATLAS_FEE_PAYER_IDL } from "@staratlas/atlas-prime";
import { CARGO_IDL } from "@staratlas/cargo";
import { CRAFTING_IDL } from "@staratlas/crafting";
import { PLAYER_PROFILE_IDL } from "@staratlas/player-profile";
import { POINTS_IDL } from "@staratlas/points";
import { PROFILE_FACTION_IDL } from "@staratlas/profile-faction";
import { PROFILE_VAULT_IDL } from "@staratlas/profile-vault";
import { SAGE_IDL } from "@staratlas/sage";
import { Effect } from "effect";
import { programIds } from "../../constants/programs";
import { SolanaService } from "../services/SolanaService";

export const getSagePrograms = () =>
	SolanaService.anchorProvider.pipe(
		Effect.map((anchorProvider) => ({
			atlasPrime: new Program(
				ATLAS_FEE_PAYER_IDL,
				new PublicKey(programIds.atlasPrimeProgramId),
				anchorProvider,
			),
			sage: new Program(
				SAGE_IDL,
				new PublicKey(programIds.sageProgramId),
				anchorProvider,
			),
			cargo: new Program(
				CARGO_IDL,
				new PublicKey(programIds.cargoProgramId),
				anchorProvider,
			),
			crafting: new Program(
				CRAFTING_IDL,
				new PublicKey(programIds.craftingProgramId),
				anchorProvider,
			),
			points: new Program(
				POINTS_IDL,
				new PublicKey(programIds.pointsProgramId),
				anchorProvider,
			),
			playerProfile: new Program(
				PLAYER_PROFILE_IDL,
				new PublicKey(programIds.playerProfileProgramId),
				anchorProvider,
			),
			profileFaction: new Program(
				PROFILE_FACTION_IDL,
				new PublicKey(programIds.profileFactionProgramId),
				anchorProvider,
			),
			profileVaultProgram: new Program(
				PROFILE_VAULT_IDL,
				new PublicKey(programIds.profileVaultProgramId),
				anchorProvider,
			),
		})),
	);
