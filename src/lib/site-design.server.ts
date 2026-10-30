import { publicCatalogClient } from "./channel-catalog.server";
import { defaultDesign, siteDesignSchema } from "./site-design";

export async function readPublishedDesign() {
  const { data, error } = await publicCatalogClient().from("site_design_settings").select("config").eq("id", "published").maybeSingle();
  if (error) throw new Error("تعذّر تحميل التصميم المنشور.");
  return data ? siteDesignSchema.parse(data.config) : defaultDesign();
}