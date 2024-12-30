import type { PublicKey } from "@solana/web3.js";
import { ProfileFactionAccount } from "@staratlas/profile-faction";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";

export const getProfileFactionAddress = (playerProfile: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try(() => {
				const [pubKey] = ProfileFactionAccount.findAddress(
					programs.profileFaction,
					playerProfile,
				);

				return pubKey;
			}),
		),
	);
