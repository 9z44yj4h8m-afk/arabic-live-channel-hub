import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { seedEntries, type CatalogEntry } from "./channel-catalog";
import type { Channel } from "./channels";
import { defaultSections, sectionsSchema } from "./catalog-sections";

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
  const { data: state, error: stateError } = await client.from("channel_catalog_state").select("revision,sections").eq("id", 1).maybeSingle();
  if (stateError) throw new Error("تعذّر تحميل القنوات. حاول مجددًا.");
  if (!state?.revision) return { revision: 0, entries: seedEntries(), sections: defaultSections() };
  const data = [];
  for (let offset = 0; offset < 15000; offset += 1000) {
    const { data: page, error } = await client.from("channel_catalog_entries").select("channel,position,deleted,hidden").order("position").order("id").range(offset, offset + 999);
    if (error) throw new Error("تعذّر تحميل القنوات. حاول مجددًا.");
    data.push(...page);
    if (page.length < 1000) break;
  }
  const entries: CatalogEntry[] = (data ?? []).map((row) => {
    const r = row as { channel: unknown; position: number; deleted: boolean; hidden?: boolean | null };
    return { channel: r.channel as Channel, position: r.position, deleted: r.deleted, hidden: r.hidden === true };
  });
  return { revision: state.revision, entries, sections: state.sections ? sectionsSchema.parse(state.sections) : defaultSections() };
}
export async function requireAdmin(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("هذا الحساب غير مصرح له بإدارة القنوات.");
}