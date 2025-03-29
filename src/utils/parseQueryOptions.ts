import { type AtomQueryOptions, queryOptionsDecoder } from "../types";

export const parseQueryOptions = (opts: unknown): AtomQueryOptions =>
	queryOptionsDecoder.parse(opts);
