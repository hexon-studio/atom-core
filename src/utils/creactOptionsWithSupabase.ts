import type { GlobalOptions, GlobalOptionsWithSupabase } from "../types";

export const creactOptionsWithSupabase = (
	globalOps: GlobalOptions,
): GlobalOptionsWithSupabase => {
	const { supabaseKey, supabaseUrl, taskId, ...rest } = globalOps;

	return {
		...rest,
		supabaseArgs:
			supabaseKey && supabaseUrl && taskId
				? {
						supabaseKey,
						supabaseUrl,
						taskId,
					}
				: undefined,
	};
};
