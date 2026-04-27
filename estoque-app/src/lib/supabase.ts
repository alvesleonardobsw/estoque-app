import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configuradas.",
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
