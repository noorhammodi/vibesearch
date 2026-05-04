import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    `Supabase not configured.\n` +
    `NEXT_PUBLIC_SUPABASE_URL: ${url ? "✓" : "missing"}\n` +
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${key ? "✓" : "missing"}`
  );
}

export const supabase = createClient(url, key);
