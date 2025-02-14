import type { Fleet } from "@staratlas/sage";
import { Effect, Record } from "effect";
import type { UnknownException } from "effect/Cause";
import type { GameService } from "~/core/services/GameService";
import type { SolanaService } from "~/core/services/SolanaService";
import type {
	FindPdaError,
	GameNotInitializedError,
	GetParsedTokenAccountsByOwnerError,
	ReadFromRPCError,
} from "~/errors";
import {
	type CargoPodEnhanced,
	getFleetCargoPodInfoByType,
} from "~/libs/@staratlas/cargo";
import type { CargoPodKind } from "~/utils/decoders";

export const getFleetCargoPodInfosForItems = ({
	fleetAccount,
	cargoPodKinds,
}: { fleetAccount: Fleet; cargoPodKinds: CargoPodKind[] }): Effect.Effect<
	Partial<Record<CargoPodKind, CargoPodEnhanced>>,
	| ReadFromRPCError
	| GetParsedTokenAccountsByOwnerError
	| GameNotInitializedError
	| FindPdaError
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
