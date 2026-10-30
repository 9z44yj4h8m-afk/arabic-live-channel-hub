import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { seedEntries, type CatalogEntry } from "./channel-catalog";
import type { Channel } from "./channels";

export function publicCatalogClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("تعذّر الاتصال بالقنوات");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}
export async function readCatalog(client: SupabaseClient<Database>) {
  const { data: state, error: stateError } = await client.from("channel_catalog_state").select("revision").eq("id", 1).maybeSingle();
  if (stateError) throw new Error("تعذّر تحميل القنوات. حاول مجددًا.");
  if (!state?.revision) return { revision: 0, entries: seedEntries() };
  const { data, error } = await client.from("channel_catalog_entries").select("channel,position,deleted").order("position");
  if (error) throw new Error("تعذّر تحميل القنوات. حاول مجددًا.");
  const entries: CatalogEntry[] = (data ?? []).map((row) => ({ channel: row.channel as unknown as Channel, position: row.position, deleted: row.deleted }));
  return { revision: state.revision, entries };
}
export async function requireAdmin(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("هذا الحساب غير مصرح له بإدارة القنوات.");
}