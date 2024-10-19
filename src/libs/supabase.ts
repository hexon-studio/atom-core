import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const createSupabaseClient = ({
	supabaseKey,
	supabaseUrl,
}: { supabaseUrl: string; supabaseKey: string }) =>
	createClient<Database>(supabaseUrl, supabaseKey);

export type CreateSupabaseClient = ReturnType<typeof createSupabaseClient>;
