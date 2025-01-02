import type { Fleet } from "@staratlas/sage";
import { Effect, Record } from "effect";
import type { UnknownException } from "effect/Cause";
import type { GameService } from "~/core/services/GameService";
import type { GameNotInitializedError } from "~/core/services/GameService/utils";
import type { GetParsedTokenAccountsByOwnerError } from "~/core/services/GameService/utils/getParsedTokenAccountsByOwner";
import type {
	CreateKeypairError,
	CreateProviderError,
	SolanaService,
} from "~/core/services/SolanaService";
import type { CargoPodKind } from "~/decoders";
import {
	type CargoPodEnhanced,
	getFleetCargoPodInfoByType,
} from "~/libs/@staratlas/cargo";
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source/readFromSage";

export const getFleetCargoPodInfosForItems = ({
	fleetAccount,
	cargoPodKinds,
}: { fleetAccount: Fleet; cargoPodKinds: CargoPodKind[] }): Effect.Effect<
	Partial<Record<CargoPodKind, CargoPodEnhanced>>,
	| CreateProviderError
	| ReadFromRPCError
	| CreateKeypairError
	| GetParsedTokenAccountsByOwnerError
	| GameNotInitializedError
	| UnknownException,
	SolanaService | GameService
> =>
	Effect.all(
		cargoPodKinds.map((cargoPodKind) =>
			getFleetCargoPodInfoByType({
				fleetAccount,
				type: cargoPodKind,
			}).pipe(Effect.map((info) => [cargoPodKind, info] as const)),
		),
		{ concurrency: "unbounded" },
	).pipe(Effect.map(Record.fromEntries));
