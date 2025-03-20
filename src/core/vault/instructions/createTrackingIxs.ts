import { SystemProgram } from "@solana/web3.js";
import type { InstructionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import type { SolanaService } from "~/core/services/SolanaService";
import type { GameNotInitializedError } from "~/errors";
import { GameService } from "../../services/GameService";
import { getGameContext } from "../../services/GameService/utils";

export const createTrackingIxs = (): Effect.Effect<
	InstructionReturn[],
	GameNotInitializedError,
	GameService | SolanaService
> =>
	Effect.gen(function* () {
		const context = yield* getGameContext();

		const trackingAddress =
			context.options.kind === "exec" ? context.options.trackingAddress : null;

		if (!trackingAddress) {
			return [];
		}

		const signer = yield* GameService.signer;

		return [
			async () => ({
				signers: [signer],
				instruction: SystemProgram.transfer({
					fromPubkey: signer.publicKey(),
					toPubkey: trackingAddress,
					lamports: 1,
				}),
			}),
		] satisfies InstructionReturn[];
	});
