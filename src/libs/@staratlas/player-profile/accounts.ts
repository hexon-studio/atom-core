import type { PublicKey } from "@solana/web3.js";
import { PlayerProfile } from "@staratlas/player-profile";
import { Effect } from "effect";
import { getSagePrograms } from "~/core/programs";
import { readFromSage } from "~/libs/@staratlas/data-source";

export const getPlayerProfileAccount = (playeProfilePublicKey: PublicKey) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			readFromSage(
				programs.playerProfile,
				playeProfilePublicKey,
				PlayerProfile,
			),
		),
	);
