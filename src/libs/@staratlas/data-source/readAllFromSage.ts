import type {
	GetProgramAccountsFilter,
	TransactionConfirmationStatus,
} from "@solana/web3.js";
import type { Idl, Program } from "@staratlas/anchor";
import {
	type Account,
	type AccountStatic,
	readAllFromRPC,
} from "@staratlas/data-source";
import { Effect } from "effect";
import { ReadAllFromRPCError } from "~/errors";

export const readAllFromSage = <A extends Account, IDL extends Idl>(
	program: Program<IDL>,
	resourceType: AccountStatic<A, IDL>,
	commitment: TransactionConfirmationStatus = "confirmed",
	additionalFilters: GetProgramAccountsFilter[] = [],
) =>
	Effect.tryPromise({
		try: () =>
			readAllFromRPC(
				program.provider.connection,
				program,
				resourceType,
				commitment,
				additionalFilters,
			),
		catch: (error) =>
			new ReadAllFromRPCError({
				error,
			}),
	});
