import { Console, Context, Effect, Layer } from "effect";

export class NotificationService extends Context.Tag("app/NotificationService")<
  NotificationService,
  {
    notify: (message: string) => Effect.Effect<void>;
  }
>() {}

export const createNotificationServiceLive = () =>
  Layer.succeed(
    NotificationService,
    NotificationService.of({
      notify: (message) => Console.log(message),
    })
  );
