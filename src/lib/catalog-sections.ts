import { z } from "zod";
import type { CatalogEntry } from "./channel-catalog";

export const sectionNameSchema = z.string().transform((v) => v.replace(/\s+/g, " ").trim()).pipe(z.string().min(1, "اسم القسم مطلوب").max(40).regex(/^[^<>{}`\\]+$/, "اسم غير صالح"));
export const catalogSectionSchema = z.object({ slug: z.string().regex(/^[a-z0-9_-]+$/).max(80), category: z.string().min(1).max(80), title: sectionNameSchema, deleted: z.boolean() });
export type CatalogSection = z.infer<typeof catalogSectionSchema>;
export const sectionsSchema = z.array(catalogSectionSchema).min(1).max(100).superRefine((rows, ctx) => {
  for (const field of ["slug", "category"] as const) if (new Set(rows.map((s) => s[field])).size !== rows.length) ctx.addIssue({ code: "custom", message: "قسم مكرر" });
  const active = rows.filter((s) => !s.deleted);
  if (!active.length) ctx.addIssue({ code: "custom", message: "يجب إبقاء قسم واحد على الأقل" });
  if (new Set(active.map((s) => s.title.toLowerCase())).size !== active.length) ctx.addIssue({ code: "custom", message: "اسم القسم مستخدم مسبقًا" });
});
export function defaultSections(): CatalogSection[] {
  return [["news", "إخبارية", "الإخبارية"], ["sports", "رياضية", "الرياضية"], ["islamic", "إسلامية", "الإسلامية"], ["movies", "أفلام كاملة", "أفلام كاملة"], ["series", "مسلسلات وأفلام", "المسلسلات"], ["kids", "أطفال ووثائقي", "أطفال ووثائقي"], ["general", "عامة", "عامة"]].map(([slug, category, title]) => ({ slug: slug ?? "", category: category ?? "", title: title ?? "", deleted: false }));
}
export function addSection(sections: CatalogSection[], title: string): CatalogSection[] {
  const slug = `section-${crypto.randomUUID()}`;
  return sectionsSchema.parse([...sections, { slug, category: slug, title, deleted: false }]);
}
export function moveSection(sections: CatalogSection[], slug: string, direction: -1 | 1) {
  const next = [...sections]; const index = next.findIndex((s) => s.slug === slug); const current = next[index]; const target = next[index + direction];
  if (current && target) { next[index] = target; next[index + direction] = current; }
  return next;
}
export function removeSection(sections: CatalogSection[], entries: CatalogEntry[], slug: string, destination: string) {
  const source = sections.find((s) => s.slug === slug && !s.deleted);
  const target = sections.find((s) => s.category === destination && !s.deleted && s.slug !== slug);
  if (!source || !target) throw new Error("اختر قسمًا آخر لنقل القنوات إليه");
  return { sections: sectionsSchema.parse(sections.map((s) => s.slug === slug ? { ...s, deleted: true } : s)), entries: entries.map((e) => e.channel.category === source.category ? { ...e, channel: { ...e.channel, category: target.category } } : e) };
}
export function editChannel(entries: CatalogEntry[], id: string, name: string, category: string) {
  const validName = z.string().trim().min(1, "اسم القناة مطلوب").max(120).regex(/^[^<>{}`\\]+$/, "اسم غير صالح").parse(name);
  return entries.map((e) => e.channel.id === id ? { ...e, channel: { ...e.channel, name: validName, category } } : e);
}