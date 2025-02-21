import type { TransactionReturn } from "@staratlas/data-source";
import { Effect } from "effect";
import { sendTransaction } from "./sendTransaction";

export const sendAllTransactions = (txs: Array<TransactionReturn>) =>
	Effect.all(txs.map(sendTransaction));

export type SendTransactions = typeof sendAllTransactions;
