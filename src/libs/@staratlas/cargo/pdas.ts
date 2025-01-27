import type { PublicKey } from "@solana/web3.js";
import { CargoPod, CargoType } from "@staratlas/cargo";
import { Data, Effect } from "effect";
import { getSagePrograms } from "~/core/programs";

export class FindPdaError extends Data.TaggedError("FindPdaError")<{
	error: unknown;
}> {
	override get message() {
		return this.error instanceof Error
			? this.error.message
			: String(this.error);
	}
}

export const findCargoTypePda = (
	mint: PublicKey,
	cargoStatsDefinitionAddress: PublicKey,
	cargoStatsDefinitionseqId = 0,
) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try({
				try: () =>
					CargoType.findAddress(
						programs.cargo,
						cargoStatsDefinitionAddress,
						mint,
						cargoStatsDefinitionseqId,
					),
				catch: (error) => new FindPdaError({ error }),
			}),
		),
	);

export const findCargoPodPda = (podSeeds: Buffer) =>
	getSagePrograms().pipe(
		Effect.flatMap((programs) =>
			Effect.try({
				try: () => CargoPod.findAddress(programs.cargo, podSeeds),
				catch: (error) => new FindPdaError({ error }),
			}),
		),
	);
