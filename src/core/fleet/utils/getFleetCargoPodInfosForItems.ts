import type { Fleet } from "@staratlas/sage";
import { Effect, Record } from "effect";
import type { UnknownException } from "effect/Cause";
import type { ReadFromRPCError } from "~/libs/@staratlas/data-source/readFromSage";
import type { CargoPodKind } from "../../../decoders";
import {
	type CargoPodEnhanced,
	getFleetCargoPodInfoByType,
} from "../../cargo-utils";
import type { GameService } from "../../services/GameService";
import type { GameNotInitializedError } from "../../services/GameService/utils";
import type { GetParsedTokenAccountsByOwnerError } from "../../services/GameService/utils/getParsedTokenAccountsByOwner";
import type {
	CreateKeypairError,
	CreateProviderError,
	SolanaService,
} from "../../services/SolanaService";

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
