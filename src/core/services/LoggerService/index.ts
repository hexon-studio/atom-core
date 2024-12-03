import {
	Array as EffectArray,
	HashMap,
	Inspectable,
	Layer,
	Logger,
	Match,
	Record,
} from "effect";
import { constVoid } from "effect/Function";
import pino from "pino";
import type { GlobalOptionsWithWebhook } from "../../../types";
import { getEnv } from "../../../utils/env";

const createLogger = (opts: GlobalOptionsWithWebhook) => {
	const createPino = () => {
		if (opts.loggingToken) {
			const transport = pino.transport({
				target: "@logtail/pino",
				options: { sourceToken: opts.loggingToken },
			});

			return pino(transport);
		}

		return pino();
	};

	const pinoLogger = createPino();

	return Logger.make(({ logLevel, message: _message, annotations }) => {
		const [maybeMessage] = EffectArray.ensure(_message);

		const message = Inspectable.toStringUnknown(maybeMessage);

		const pinoContext = {
			context: {
				annotations: Record.fromEntries(HashMap.toEntries(annotations)),
				player_profile: opts.playerProfile,
				task_id: opts.webhookArgs?.taskId,
				user_id: opts.owner,
				version: process.env.npm_package_version ?? "0.0.0",
			},
			original_message: _message,
		};

		Match.value(logLevel.label).pipe(
			Match.when("ERROR", () => pinoLogger.error(pinoContext, message)),
			Match.when("WARN", () => pinoLogger.warn(pinoContext, message)),
			Match.when("FATAL", () => pinoLogger.fatal(pinoContext, message)),
			Match.when("INFO", () => pinoLogger.info(pinoContext, message)),
			Match.when("TRACE", () => pinoLogger.trace(pinoContext, message)),
			Match.when("DEBUG", () => pinoLogger.debug(pinoContext, message)),
			Match.orElse(constVoid),
		);
	});
};

export const createLoggerServiceLive = (opts: GlobalOptionsWithWebhook) =>
	getEnv() === "production" && opts.loggingToken
		? Logger.replace(Logger.defaultLogger, createLogger(opts))
		: Layer.empty;
