import type { PublicKey } from "@solana/web3.js";
import { ProfileFactionAccount } from "@staratlas/profile-faction";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";

export const findProfileFactionPda = (playerProfile: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() =>
				ProfileFactionAccount.findAddress(
					programs.profileFaction,
					playerProfile,
				),
			),
		),
	);
