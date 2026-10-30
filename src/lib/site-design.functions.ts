import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminSession } from "./channel-admin.server";
import { readPublishedDesign } from "./site-design.server";
import { defaultDesign, siteDesignSchema } from "./site-design";
import type { Json } from "@/integrations/supabase/types";

export const getPublishedDesign = createServerFn({ method: "GET" }).handler(() => readPublishedDesign());
export const getDesignDraft = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdminSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("site_design_settings").select("config,revision").eq("id", "draft").maybeSingle();
  if (error) throw new Error("تعذّر تحميل مسودة التصميم.");
  return { config: data ? siteDesignSchema.parse(data.config) : defaultDesign(), revision: data?.revision ?? 0 };
});
export const saveDesignDraft = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ config: siteDesignSchema, revision: z.number().int().nonnegative(), publish: z.boolean() }).strict().parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: revision, error } = await supabaseAdmin.rpc("save_site_design", { payload: data.config as unknown as Json, expected_revision: data.revision, publish: data.publish });
    if (error) throw new Error("تعذّر الحفظ؛ قد تكون المسودة تغيّرت من جهاز آخر. أعد تحميل المسودة.");
    return { revision };
  });