import { SystemProgram } from "@solana/web3.js";
import {
	type InstructionReturn,
	signerToAsyncSigner,
} from "@staratlas/data-source";
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

		const trackingKeypair = context.options.trackingKeypair;

		if (!trackingKeypair) {
			return [];
		}

		const signer = yield* GameService.signer;

		return [
			async () => ({
				signers: [signerToAsyncSigner(trackingKeypair)],
				instruction: SystemProgram.transfer({
					fromPubkey: trackingKeypair.publicKey,
					toPubkey: signer.publicKey(),
					lamports: 1,
				}),
			}),
		] satisfies InstructionReturn[];
	});
