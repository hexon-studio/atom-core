import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const createSupabaseClient = ({
	supabaseKey,
	supabaseUrl,
	accessToken,
}: { supabaseUrl: string; supabaseKey: string; accessToken: string }) =>
	createClient<Database>(supabaseUrl, supabaseKey, {
		global: { headers: { Authorization: `Bearer ${accessToken}` } },
	});

export type CreateSupabaseClient = ReturnType<typeof createSupabaseClient>;
