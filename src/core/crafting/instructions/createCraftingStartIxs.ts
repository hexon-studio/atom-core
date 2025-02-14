import { getAccount } from "@solana/spl-token";
import type { Recipe } from "@staratlas/crafting";
import { CraftingInstance } from "@staratlas/sage";
import type BN from "bn.js";
import { Effect, Option } from "effect";
import { tokenMints } from "~/constants/tokens";
import { getSagePrograms } from "~/core/programs";
import { GameService } from "~/core/services/GameService";
import { getGameContext } from "~/core/services/GameService/utils";
import { SolanaService } from "~/core/services/SolanaService";
import { getStarbaseInfoByCoords } from "~/core/utils/getStarbaseInfo";
import {
	findCraftingInstancePda,
	findCraftingProcessPda,
} from "~/libs/@staratlas/crafting/pdas";
import { findProfileFactionPda } from "~/libs/@staratlas/profile-faction";
import { findAssociatedTokenPda } from "~/utils/getAssociatedTokenAddress";

export const createCraftingStartIxs = ({
	craftingId,
	recipeAccount,
	starbaseCoords,
}: {
	craftingId: BN;
	recipeAccount: Recipe;
	starbaseCoords: [BN, BN];
}) =>
	Effect.gen(function* () {
		const context = yield* getGameContext();
		const programs = yield* getSagePrograms();

		const signer = yield* GameService.signer;

		const [profileFaction] = yield* findProfileFactionPda(
			context.options.playerProfile,
		);

		const starbaseInfo = yield* getStarbaseInfoByCoords({
			starbaseCoords,
		});

		const [craftingProcess] = yield* findCraftingProcessPda({
			craftingFacility: starbaseInfo.starbaseAccount.data.craftingFacility,
			craftingId,
			craftingRecipe: recipeAccount.key,
		});

		const [craftingInstance] = yield* findCraftingInstancePda({
			craftingProcess,
			starbasePlayer: starbaseInfo.starbasePlayerPubkey,
		});

		const tokenFrom = yield* findAssociatedTokenPda(
			tokenMints.atlas,
			signer.publicKey(),
			true,
		);

		const createTokenToAta =
			yield* GameService.createAssociatedTokenAccountIdempotent(
				tokenMints.atlas,
				craftingProcess,
				true,
			);

		const ixs = [];

		const provider = yield* SolanaService.anchorProvider;

		const maybeIngredientAtaAccount = yield* Effect.tryPromise(() =>
			getAccount(provider.connection, createTokenToAta.address, "confirmed"),
		).pipe(Effect.option);

		if (Option.isNone(maybeIngredientAtaAccount)) {
			ixs.push(createTokenToAta.instructions);
		}

		return [
			...ixs,
			CraftingInstance.startCraftingProcess(
				programs.sage,
				programs.crafting,
				signer,
				context.playerProfile.key,
				profileFaction,
				starbaseInfo.starbasePlayerPubkey,
				starbaseInfo.starbaseAccount.key,
				craftingInstance,
				craftingProcess,
				starbaseInfo.starbaseAccount.data.craftingFacility,
				recipeAccount.key,
				context.gameInfo.gameId,
				context.gameInfo.gameStateId,
				{ keyIndex: context.keyIndexes.sage },
				recipeAccount.data.feeRecipient.key,
				signer,
				tokenFrom,
				createTokenToAta.address,
			),
		];
	});
