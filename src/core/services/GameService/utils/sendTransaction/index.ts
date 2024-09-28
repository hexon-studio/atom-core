import {
  TransactionReturn,
  sendTransaction as sageSendTransaction,
} from "@staratlas/data-source";
import { Console, Data, Effect } from "effect";
import { SolanaService } from "../../../SolanaService";

class SendTransactionError extends Data.TaggedError("SendTransactionError")<{
  readonly error: unknown;
}> {}

export const sendTransaction = (tx: TransactionReturn) =>
  SolanaService.pipe(
    Effect.flatMap((solanaService) => solanaService.anchorProvider),
    Effect.flatMap((provider) =>
      Effect.retry(
        Console.log("Sending transaction").pipe(
          Effect.flatMap(() =>
            Effect.tryPromise({
              try: () => sageSendTransaction(tx, provider.connection),
              catch: (error) => new SendTransactionError({ error }),
            })
          ),
          Effect.flatMap((result) =>
            result.value.isOk()
              ? Effect.succeed(result.value.value)
              : Effect.fail(result.value.error)
          )
        ),
        { times: 5 }
      )
    )
  );

export type SendTransaction = typeof sendTransaction;
