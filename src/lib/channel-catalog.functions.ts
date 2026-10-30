import { createServerFn } from "@tanstack/react-start";
import { activeChannels, saveCatalogSchema } from "./channel-catalog";
import { publicCatalogClient, readCatalog } from "./channel-catalog.server";
import { requireAdminSession } from "./channel-admin.server";
import type { Json } from "@/integrations/supabase/types";

export const getPublicChannels = createServerFn({ method: "GET" }).handler(async () => {
  return activeChannels((await readCatalog(publicCatalogClient())).entries);
});
export const getAdminCatalog = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return readCatalog(supabaseAdmin);
});
export const saveAdminCatalog = createServerFn({ method: "POST" })
  .inputValidator((input) => saveCatalogSchema.parse(input)).handler(async ({ data }) => {
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: revision, error } = await supabaseAdmin.rpc("save_channel_catalog", {
      entries: data.entries as unknown as Json, expected_revision: data.revision,
    });
    if (error) throw new Error(`تعذّر الحفظ: ${error.message}`);
    return { revision };
  });