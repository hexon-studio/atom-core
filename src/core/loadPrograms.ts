import { AnchorProvider, Program } from "@staratlas/anchor";
import { ATLAS_FEE_PAYER_IDL } from "@staratlas/atlas-prime";
import { CARGO_IDL } from "@staratlas/cargo";
import { CLAIM_STAKE_IDL } from "@staratlas/claim-stake";
import { CRAFTING_IDL } from "@staratlas/crafting";
import { GALACTIC_MARKETPLACE_IDL } from "@staratlas/galactic-marketplace";
import { PLAYER_PROFILE_IDL } from "@staratlas/player-profile";
import { POINTS_IDL } from "@staratlas/points";
import { POINTS_STORE_IDL } from "@staratlas/points-store";
import { PROFILE_FACTION_IDL } from "@staratlas/profile-faction";
import { PROFILE_VAULT_IDL } from "@staratlas/profile-vault";
import { SAGE_IDL } from "@staratlas/sage";
import { programIds } from "../constants/programs";
export const loadPrograms = (provider?: AnchorProvider) => {
  return {
    galacticMarketplaceProgram: new Program(
      GALACTIC_MARKETPLACE_IDL,
      programIds.galacticMarketplaceProgramId,
      provider
    ),
    sageProgram: new Program(SAGE_IDL, programIds.sageProgramId, provider),
    craftingProgram: new Program(
      CRAFTING_IDL,
      programIds.craftingProgramId,
      provider
    ),

    cargoProgram: new Program(CARGO_IDL, programIds.cargoProgramId, provider),

    playerProfileProgram: new Program(
      PLAYER_PROFILE_IDL,
      programIds.playerProfileProgramId,
      provider
    ),

    profileVaultProgram: new Program(
      PROFILE_VAULT_IDL,
      programIds.profileVaultProgramId,
      provider
    ),

    profileFactionProgram: new Program(
      PROFILE_FACTION_IDL,
      programIds.profileFactionProgramId,
      provider
    ),

    pointsProgram: new Program(
      POINTS_IDL,
      programIds.pointsProgramId,
      provider
    ),

    pointsStoreProgram: new Program(
      POINTS_STORE_IDL,
      programIds.pointsStoreProgramId,
      provider
    ),

    atlasPrimeProgram: new Program(
      ATLAS_FEE_PAYER_IDL,
      programIds.atlasPrimeProgramId,
      provider
    ),

    claimStakesProgram: new Program(
      CLAIM_STAKE_IDL,
      programIds.claimStakesProgramId,
      provider
    ),
  };
};
