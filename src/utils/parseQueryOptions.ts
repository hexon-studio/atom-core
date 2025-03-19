import { type QueryOptions, queryOptionsDecoder } from "../types";

export const parseQueryOptions = (opts: unknown): QueryOptions =>
	queryOptionsDecoder.parse(opts);
