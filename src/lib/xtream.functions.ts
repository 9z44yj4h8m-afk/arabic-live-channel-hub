import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminSession } from "./channel-admin.server";
import { requireSiteSession } from "./site-gate.server";
import { connection, encrypt, provider } from "./xtream.server";
import { credentialsSchema, kindSchema, normalizeRows } from "./xtream";
import type { Json } from "@/integrations/supabase/types";

export const getSubscriptionStatus = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession(); const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("xtream_connections").select("revision,updated_at").eq("id", 1).maybeSingle();
  if (error) throw new Error("تعذّر تحميل الاشتراك"); return { configured: Boolean(data), revision: data?.revision ?? 0 };
});
export const saveSubscription = createServerFn({ method: "POST" }).inputValidator(z.object({ credentials: credentialsSchema, revision: z.number().int().nonnegative() })).handler(async ({ data }) => {
  await requireAdminSession(); const result = await provider(data.credentials);
  const info = z.object({ user_info: z.object({ auth: z.union([z.literal(1), z.literal("1")]), status: z.literal("Active") }) }).safeParse(result);
  if (!info.success) throw new Error("الاشتراك غير نشط أو بيانات الدخول غير صحيحة");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.rpc("save_xtream_connection", { ciphertext: encrypt(data.credentials), expected_revision: data.revision });
  if (error) throw new Error("لم يُحفظ الاشتراك؛ أعد تحميل اللوحة وحاول مجددًا"); return { ok: true };
});
export const syncSubscription = createServerFn({ method: "POST" }).inputValidator(z.object({ kind: kindSchema, parent: z.string().regex(/^\d*$/).default("") })).handler(async ({ data }) => {
  await requireAdminSession(); const { credentials, revision, db } = await connection();
  let raw: unknown; let categories: Record<string, string> = {};
  if (data.kind === "episode") {
    if (!data.parent) throw new Error("اختر المسلسل أولًا");
    const detail = z.object({ episodes: z.record(z.array(z.record(z.unknown()))) }).parse(await provider(credentials, "get_series_info", data.parent));
    raw = Object.entries(detail.episodes).flatMap(([season, rows]) => rows.map(r => ({ ...r, season: Number(season) })));
  } else {
    if (data.parent) throw new Error("طلب غير صالح");
    const prefix = data.kind === "movie" ? "vod" : data.kind;
    const [list, cats] = await Promise.all([provider(credentials, `get_${prefix}_${data.kind === "series" ? "" : "streams"}`.replace(/_$/, "")), provider(credentials, `get_${prefix}_categories`)]);
    raw = list; categories = Object.fromEntries(z.array(z.object({ category_id: z.union([z.string(), z.number()]), category_name: z.string() })).parse(cats).map(c => [String(c.category_id), c.category_name]));
  }
  const rows = normalizeRows(raw, categories, data.kind);
  const { error } = await db.rpc("sync_xtream_items", { payload: rows as unknown as Json, target_kind: data.kind, target_parent: data.parent, expected_revision: revision });
  if (error) throw new Error("لم تكتمل المزامنة؛ أعد المحاولة بعد تحديث اللوحة"); return { count: rows.length };
});
export const getSubscriptionItems = createServerFn({ method: "GET" }).inputValidator(z.object({ kind: kindSchema, parent: z.string().regex(/^\d*$/).default("") })).handler(async ({ data }) => {
  await requireSiteSession(); const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows = []; for (let offset = 0; offset < 20000; offset += 1000) {
    const { data: page, error } = await supabaseAdmin.from("xtream_items").select("id,remote_id,name,category,season,episode,position").eq("kind", data.kind).eq("parent_id", data.parent).eq("deleted", false).eq("hidden", false).order("position").order("id").range(offset, offset + 999);
    if (error) throw new Error("تعذّر تحميل محتوى الاشتراك"); rows.push(...page); if (page.length < 1000) break;
  } return rows;
});
export const getAdminSeries = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession(); const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows: { remote_id: string }[] = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const { data, error } = await supabaseAdmin.from("xtream_items").select("remote_id").eq("kind", "series").eq("deleted", false).order("position").order("id").range(offset, offset + 999);
    if (error) throw new Error("تعذّر تحميل المسلسلات"); rows.push(...data); if (data.length < 1000) break;
  } return rows;
});