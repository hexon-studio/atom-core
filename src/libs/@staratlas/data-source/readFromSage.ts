import type { PublicKey, TransactionConfirmationStatus } from "@solana/web3.js";
import type { Idl, Program } from "@staratlas/anchor";
import {
	type Account,
	type AccountStatic,
	readFromRPCOrError,
} from "@staratlas/data-source";
import { Effect } from "effect";
import { ReadFromRPCError } from "~/errors";

export const readFromSage = <A extends Account, IDL extends Idl>(
	program: Program<IDL>,
	resourceKey: PublicKey,
	resourceType: AccountStatic<A, IDL>,
	commitment: TransactionConfirmationStatus = "confirmed",
) =>
	Effect.tryPromise({
		try: () =>
			readFromRPCOrError(
				program.provider.connection,
				program,
				resourceKey,
				resourceType,
				commitment,
			),
		catch: (error) =>
			new ReadFromRPCError({
				error,
				accountName: resourceType.ACCOUNT_NAME,
			}),
	});
