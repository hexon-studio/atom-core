import {
	Array as EffectArray,
	HashMap,
	Inspectable,
	Logger,
	Match,
	Record,
} from "effect";
import { constVoid } from "effect/Function";
import pino from "pino";
import { version as packageJsonVersion } from "../../../../package.json";
import type { GlobalOptions } from "../../../types";
import { getEnv } from "../../../utils/env";

const createLogger = (opts: GlobalOptions) => {
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
				context_id: opts.webhookArgs?.contextId,
				user_id: opts.owner,
				version: packageJsonVersion,
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

export const createLoggerServiceLive = (opts: GlobalOptions) => {
	if (opts.logDisabled) {
		return Logger.remove(Logger.defaultLogger);
	}

	return getEnv() === "production" && opts.loggingToken
		? Logger.replace(Logger.defaultLogger, createLogger(opts))
		: Logger.replace(
				Logger.defaultLogger,
				Logger.prettyLogger({ mode: "auto" }),
			);
};
