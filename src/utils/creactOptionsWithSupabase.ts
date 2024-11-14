import type { GlobalOptions, GlobalOptionsWithSupabase } from "../types";

export const creactOptionsWithSupabase = (
	globalOps: GlobalOptions,
): GlobalOptionsWithSupabase => {
	const { supabaseKey, supabaseUrl, accessToken, taskId, ...rest } = globalOps;

	return {
		...rest,
		supabaseArgs:
			supabaseKey && supabaseUrl && taskId
				? {
						accessToken,
						supabaseKey,
						supabaseUrl,
						taskId,
					}
				: undefined,
	};
};
