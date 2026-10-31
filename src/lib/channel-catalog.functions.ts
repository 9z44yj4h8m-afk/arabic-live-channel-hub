import { createServerFn } from "@tanstack/react-start";
import { activeChannels, saveCatalogSchema } from "./channel-catalog";
import { publicCatalogClient, readCatalog } from "./channel-catalog.server";
import { requireAdminSession } from "./channel-admin.server";
import type { Json } from "@/integrations/supabase/types";
import { defaultSections } from "./catalog-sections";
import { requireSiteSession } from "./site-gate.server";

export const getPublicChannels = createServerFn({ method: "GET" }).handler(async () => {
  await requireSiteSession();
  return activeChannels((await readCatalog(publicCatalogClient())).entries);
});
export const getCatalogSections = createServerFn({ method: "GET" }).handler(async () => {
  return (await readCatalog(publicCatalogClient())).sections;
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
    const current = await readCatalog(supabaseAdmin);
    const sections = data.sections ?? current.sections ?? defaultSections();
    if (current.sections.some((s) => !sections.some((n) => n.slug === s.slug && n.category === s.category))) throw new Error("لا يمكن تغيير معرف قسم موجود؛ استخدم الحذف القابل للاسترداد");
    if (data.entries.some((e) => !sections.some((s) => !s.deleted && s.category === e.channel.category))) throw new Error("انقل قنوات القسم المحذوف إلى قسم آخر أولًا");
    const { data: revision, error } = await supabaseAdmin.rpc("save_catalog_with_sections", {
      entries: data.entries as unknown as Json, expected_revision: data.revision,
      sections: sections as unknown as Json,
    });
    if (error) throw new Error(`تعذّر الحفظ: ${error.message}`);
    return { revision };
  });