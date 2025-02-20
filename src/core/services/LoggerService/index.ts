import {
	Array as EffectArray,
	HashMap,
	Inspectable,
	Logger,
	Match,
	Option,
	Record,
	Redacted,
} from "effect";
import { constVoid, pipe } from "effect/Function";
import pino from "pino";
import type { GlobalOptions } from "~/utils/globalOptions";
import { parseOptionsWebhook } from "~/utils/parseOptionsWebhook";
import { version as packageJsonVersion } from "../../../../package.json";
import { getEnv } from "../../../utils/env";

const createLogger = (
	token: Redacted.Redacted<string>,
	opts: GlobalOptions,
) => {
	const createPino = () => {
		const transport = pino.transport({
			target: "@logtail/pino",
			options: { sourceToken: Redacted.value(token) },
		});

		return pino(transport);
	};

	const pinoLogger = createPino();

	return Logger.make(({ logLevel, message: _message, annotations }) => {
		const [maybeMessage] = EffectArray.ensure(_message);

		const message = Inspectable.toStringUnknown(maybeMessage);

		const pinoContext = {
			context: {
				annotations: Record.fromEntries(HashMap.toEntries(annotations)),
				player_profile: opts.playerProfile,
				context_id: pipe(
					parseOptionsWebhook(opts),
					Option.map((opts) => opts.contextId),
					Option.getOrUndefined,
				),
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

export const createLoggerServiceLive = (opts: GlobalOptions) =>
	getEnv() === "production" && Option.isSome(opts.loggingToken)
		? Logger.replace(
				Logger.defaultLogger,
				createLogger(opts.loggingToken.value, opts),
			)
		: Logger.replace(
				Logger.defaultLogger,
				Logger.prettyLogger({ mode: "auto" }),
			);
