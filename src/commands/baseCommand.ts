import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ProfileVault } from "@staratlas/profile-vault";
import { Effect, Array as EffectArray, unsafeCoerce } from "effect";
import { getAssociatedTokenAccountBalance } from "~/utils/getAssociatedTokenAccountBalance";
import { MIN_ATLAS_QTY, tokenMints } from "../constants/tokens";
import { getSagePrograms } from "../core/programs";
import { AtlasNotEnoughError } from "../core/services/GameService/methods/initGame";
import { getGameContext } from "../core/services/GameService/utils";
import { fireWebhookEvent } from "../utils/fireWebhookEvent";

const checkAtlasBalance = () =>
	Effect.gen(function* () {
		const programs = yield* getSagePrograms();

		const context = yield* getGameContext();

		const [vaultAuthority] = ProfileVault.findVaultSigner(
			programs.profileVaultProgram,
			context.playerProfile.key,
			context.owner,
		);

		const funderVault = getAssociatedTokenAddressSync(
			tokenMints.atlas,
			vaultAuthority,
			true,
		);

		const atlasBalance = yield* getAssociatedTokenAccountBalance(funderVault);

		if (atlasBalance.ltn(MIN_ATLAS_QTY)) {
			return yield* Effect.fail(new AtlasNotEnoughError());
		}

		return atlasBalance;
	});

export const runBaseCommand = <E, R>({
	self,
	normalizeError,
}: {
	self: () => Effect.Effect<string[], E, R>;
	normalizeError: (error: E) => {
		tag: string;
		message: string;
		signatures: string | string[] | null;
		context?: Record<string, unknown>;
	};
}) =>
	Effect.gen(function* () {
		yield* fireWebhookEvent({ type: "start" });

		yield* checkAtlasBalance();

		// yield* fireWebhookEvent({
		// 	type: "atlas-balance",
		// 	payload: { balance: balance.toString() },
		// });

		const signatures = yield* self();

		const context = yield* getGameContext();

		yield* fireWebhookEvent({
			type: "success",
			payload: {
				signatures,
				removeCredit:
					!!context.fees && !context.fees.feeAddress && signatures.length > 0,
			},
		});

		return signatures;
	}).pipe(
		Effect.tapError((error) => {
			const { tag, message, signatures, context } = normalizeError(
				unsafeCoerce(error),
			);

			return fireWebhookEvent({
				type: "error",
				payload: {
					tag,
					message,
					signatures: EffectArray.ensure(signatures ?? []),
					context,
				},
			});
		}),
	);
