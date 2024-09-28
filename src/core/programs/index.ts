import { PublicKey } from "@solana/web3.js";
import { Program } from "@staratlas/anchor";
import { CARGO_IDL } from "@staratlas/cargo";
import { PLAYER_PROFILE_IDL } from "@staratlas/player-profile";
import { POINTS_IDL } from "@staratlas/points";
import { PROFILE_FACTION_IDL } from "@staratlas/profile-faction";
import { SAGE_IDL } from "@staratlas/sage";
import { Effect } from "effect";
import { SolanaService } from "../services/SolanaService";

export const programIds = {
  galacticMarketplaceProgramId: new PublicKey(
    "traderDnaR5w6Tcoi3NFm53i48FTDNbGjBSZwWXDRrg"
  ),
  sageProgramId: new PublicKey("SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE"),
  craftingProgramId: new PublicKey(
    "CRAFT2RPXPJWCEix4WpJST3E7NLf79GTqZUL75wngXo5"
  ),
  cargoProgramId: new PublicKey("Cargo2VNTPPTi9c1vq1Jw5d3BWUNr18MjRtSupAghKEk"),
  playerProfileProgramId: new PublicKey(
    "pprofELXjL5Kck7Jn5hCpwAL82DpTkSYBENzahVtbc9"
  ),
  profileVaultProgramId: new PublicKey(
    "pv1ttom8tbyh83C1AVh6QH2naGRdVQUVt3HY1Yst5sv"
  ),
  profileFactionProgramId: new PublicKey(
    "pFACSRuobDmvfMKq1bAzwj27t6d2GJhSCHb1VcfnRmq"
  ),
  pointsProgramId: new PublicKey("Point2iBvz7j5TMVef8nEgpmz4pDr7tU7v3RjAfkQbM"),
  pointsStoreProgramId: new PublicKey(
    "PsToRxhEPScGt1Bxpm7zNDRzaMk31t8Aox7fyewoVse"
  ),
  atlasPrimeProgramId: new PublicKey(
    "APR1MEny25pKupwn72oVqMH4qpDouArsX8zX4VwwfoXD"
  ),
  claimStakesProgramId: new PublicKey(
    "STAKEr4Bh8sbBMoAVmTDBRqouPzgdocVrvtjmhJhd65"
  ),
  scoreProgramId: new PublicKey("FLEET1qqzpexyaDpqb2DGsSzE2sDCizewCg9WjrA6DBW"),
  factionEnlistmentProgramId: new PublicKey(
    "FACTNmq2FhA2QNTnGM2aWJH3i7zT3cND5CgvjYTjyVYe"
  ),
} as const;

export const SagePrograms = Effect.gen(function* () {
  const solanaService = yield* SolanaService;
  const anchorProvider = yield* solanaService.anchorProvider;

  return yield* Effect.sync(() => ({
    sage: new Program(
      SAGE_IDL,
      new PublicKey(programIds.sageProgramId),
      anchorProvider
    ),
    cargo: new Program(
      CARGO_IDL,
      new PublicKey(programIds.cargoProgramId),
      anchorProvider
    ),
    points: new Program(
      POINTS_IDL,
      new PublicKey(programIds.pointsProgramId),
      anchorProvider
    ),
    playerProfile: new Program(
      PLAYER_PROFILE_IDL,
      new PublicKey(programIds.playerProfileProgramId),
      anchorProvider
    ),
    profileFaction: new Program(
      PROFILE_FACTION_IDL,
      new PublicKey(programIds.profileFactionProgramId),
      anchorProvider
    ),
  }));
});
