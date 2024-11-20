import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { ProfileVault } from "@staratlas/profile-vault";
import { Console, Effect, unsafeCoerce } from "effect";
import { constant } from "effect/Function";
import { MIN_ATLAS_QTY, tokenMints } from "../constants/tokens";
import { SagePrograms } from "../core/programs";
import { AtlasNotEnoughError } from "../core/services/GameService/methods/initGame";
import { getGameContext } from "../core/services/GameService/utils";
import { SolanaService } from "../core/services/SolanaService";
import { fireWebhookEvent } from "../utils/fireWebhookEvent";

const checkAtlasBalance = () =>
	Effect.gen(function* () {
		const solanaService = yield* SolanaService;

		const programs = yield* SagePrograms;

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

		const provider = yield* solanaService.anchorProvider;

		const atlasBalance = yield* Effect.tryPromise(() =>
			provider.connection.getTokenAccountBalance(funderVault, "confirmed"),
		).pipe(
			Effect.tapError((error) => Console.log("Cannot get atlas amount", error)),
			Effect.map((resp) => resp.value.uiAmount ?? 0),
			Effect.orElseSucceed(constant(-1)),
		);

		if (
			atlasBalance === 0 ||
			(atlasBalance > 0 && atlasBalance < MIN_ATLAS_QTY)
		) {
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
		signature?: string;
	};
}) =>
	fireWebhookEvent({ type: "start" }).pipe(
		Effect.flatMap(checkAtlasBalance),
		Effect.tap((balance) =>
			fireWebhookEvent({ type: "atlas-balance", payload: { balance } }),
		),
		Effect.flatMap(self),
		Effect.tapBoth({
			onFailure: (error) => {
				const { message, tag, signature } = normalizeError(unsafeCoerce(error));

				return fireWebhookEvent({
					type: "error",
					payload: {
						tag,
						message,
						signatures: signature ? [signature] : [],
					},
				});
			},
			onSuccess: (signatures) =>
				getGameContext().pipe(
					Effect.tap((context) =>
						fireWebhookEvent({
							type: "success",
							payload: {
								signatures,
								removeCredit: !context.fees.feeAddress,
							},
						}),
					),
				),
		}),
	);
