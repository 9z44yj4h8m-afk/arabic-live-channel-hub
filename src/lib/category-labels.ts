import { z } from "zod";

export const categoryKeys = ["home", "live", "movies", "series", "news", "sports", "islamic", "kids", "general", "movieChannels"] as const;
export type CategoryKey = (typeof categoryKeys)[number];
export type CategoryLabels = Record<CategoryKey, string>;

export const defaultCategoryLabels: CategoryLabels = {
  home: "الرئيسية", live: "البث المباشر", movies: "الأفلام", series: "المسلسلات", news: "الإخبارية",
  sports: "الرياضية", islamic: "الإسلامية", kids: "أطفال ووثائقي", general: "عامة", movieChannels: "أفلام كاملة",
};
/** Internal category stored on channels, per section key (never changes when renamed). */
export const categoryOfKey: Partial<Record<CategoryKey, string>> = {
  news: "إخبارية", sports: "رياضية", islamic: "إسلامية", series: "مسلسلات وأفلام", movieChannels: "أفلام كاملة", kids: "أطفال ووثائقي", general: "عامة",
};
export function keyOfCategory(category: string): CategoryKey | undefined {
  return (Object.keys(categoryOfKey) as CategoryKey[]).find((k) => categoryOfKey[k] === category);
}

export const categoryLabelInput = z.object({
  key: z.enum(categoryKeys),
  label: z.string().transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "الاسم مطلوب").max(40, "الاسم أطول من 40 حرفًا").regex(/^[^<>{}`\\]+$/, "الاسم يحتوي رموزًا غير مسموحة")),
});

/** Throws an Arabic message when the new label duplicates another category's current label. */
export function assertUniqueLabel(labels: CategoryLabels, key: CategoryKey, label: string) {
  const norm = (s: string) => s.trim().toLowerCase();
  const clash = categoryKeys.find((k) => k !== key && norm(labels[k]) === norm(label));
  if (clash) throw new Error(`الاسم مستخدم مسبقًا لتصنيف «${labels[clash]}»`);
}

export function mergeLabels(rows: { key: string; label: string }[]): CategoryLabels {
  const out = { ...defaultCategoryLabels };
  for (const r of rows) if ((categoryKeys as readonly string[]).includes(r.key)) out[r.key as CategoryKey] = r.label;
  return out;
}
