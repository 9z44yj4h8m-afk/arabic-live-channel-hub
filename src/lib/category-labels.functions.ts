import { createServerFn } from "@tanstack/react-start";
import { assertUniqueLabel, categoryLabelInput, mergeLabels } from "./category-labels";
import { publicCatalogClient } from "./channel-catalog.server";
import { requireAdminSession } from "./channel-admin.server";

export const getCategoryLabels = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicCatalogClient().from("category_labels").select("key,label");
  if (error) throw new Error("تعذّر تحميل أسماء التصنيفات");
  return mergeLabels(data ?? []);
});

export const saveCategoryLabel = createServerFn({ method: "POST" })
  .inputValidator((input) => categoryLabelInput.parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error: readError } = await supabaseAdmin.from("category_labels").select("key,label");
    if (readError) throw new Error("تعذّر قراءة التصنيفات");
    const current = mergeLabels(rows ?? []);
    assertUniqueLabel(current, data.key, data.label);
    const { error } = await supabaseAdmin.from("category_labels").upsert({ key: data.key, label: data.label, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.code === "23505" ? "الاسم مستخدم مسبقًا" : "تعذّر حفظ الاسم");
    return { ...current, [data.key]: data.label };
  });
