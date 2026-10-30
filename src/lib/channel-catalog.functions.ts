import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { activeChannels, saveCatalogSchema } from "./channel-catalog";
import { publicCatalogClient, readCatalog, requireAdmin } from "./channel-catalog.server";
import type { Json } from "@/integrations/supabase/types";

export const getPublicChannels = createServerFn({ method: "GET" }).handler(async () => {
  return activeChannels((await readCatalog(publicCatalogClient())).entries);
});
export const getAdminCatalog = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireAdmin(context.supabase, context.userId);
  return readCatalog(context.supabase);
});
export const saveAdminCatalog = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => saveCatalogSchema.parse(input)).handler(async ({ context, data }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: revision, error } = await context.supabase.rpc("save_channel_catalog", {
      entries: data.entries as unknown as Json, expected_revision: data.revision,
    });
    if (error) throw new Error("تعذّر الحفظ. أعد تحميل القائمة إذا حفظتها من جهاز آخر.");
    return { revision };
  });