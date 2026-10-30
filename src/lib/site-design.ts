import { z } from "zod";

export const designPages = ["home", "live", "movies", "news", "sports", "islamic", "series", "kids", "general", "movieChannels"] as const;
export type DesignPage = typeof designPages[number];
export const pageNames: Record<DesignPage, string> = { home: "الرئيسية", live: "البث", movies: "الأفلام", news: "الإخبارية", sports: "الرياضية", islamic: "الإسلامية", series: "المسلسلات", kids: "الأطفال والوثائقي", general: "العامة", movieChannels: "قنوات الأفلام" };
export const safeImageUrl = z.string().max(2048).refine((value) => {
  if (value === "") return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(url.hostname); } catch { return false; }
}, "رابط الصورة يجب أن يبدأ بـ HTTPS دون بيانات دخول");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const text = z.string().trim().max(120);
const range = (min: number, max: number) => z.number().finite().min(min).max(max);
export const elementSchema = z.object({
  id: z.string().uuid(), type: z.enum(["text", "image", "shape", "button"]),
  text, image: safeImageUrl, color, background: color,
  x: range(0, 95), y: range(0, 95), width: range(5, 100), height: range(5, 100),
  fontSize: range(10, 64), radius: range(0, 48),
}).strict().refine((e) => e.x + e.width <= 100 && e.y + e.height <= 100, "العنصر خارج مساحة التصميم");
export type DesignElement = z.infer<typeof elementSchema>;
export const settingsSchema = z.object({
  colors: z.object({ background: color, surface: color, text: color, muted: color, primary: color, buttonText: color, border: color, neon: color, shadow: color, gradientEnd: color }).strict(),
  typography: z.object({ font: z.enum(["original", "arabic", "serif", "system"]), size: range(12, 24), titleSize: range(16, 48), weight: z.enum(["400", "600", "700", "800"]), align: z.enum(["right", "center", "left"]) }).strict(),
  labels: z.object({ home: text, live: text, movies: text, series: text, news: text, sports: text, islamic: text, kids: text, general: text, movieChannels: text }).strict(),
  images: z.object({ background: safeImageUrl, logo: safeImageUrl, wolf: safeImageUrl, live: safeImageUrl, movies: safeImageUrl, series: safeImageUrl, shield: safeImageUrl }).strict(),
  layout: z.object({ maxWidth: range(320, 1920), playerWidth: range(320, 1600), ratio: z.enum(["16/9", "4/3", "21/9", "1/1"]), gap: range(0, 80), radius: range(0, 48), cardHeight: range(100, 420), logoHeight: range(48, 280), logoPosition: z.enum(["center", "right", "left"]), columns: z.number().int().min(1).max(8), stageHeight: range(160, 800) }).strict(),
  visible: z.object({ logo: z.boolean(), wolf: z.boolean(), cards: z.boolean(), lists: z.boolean(), icons: z.boolean(), nav: z.boolean(), header: z.boolean() }).strict(),
  effects: z.object({ glow: range(0, 80), shadow: range(0, 80), transition: range(0, 1500), animation: z.enum(["none", "fade", "pulse"]), gradient: z.boolean() }).strict(),
  elements: z.array(elementSchema).max(30),
}).strict();
export type DesignSettings = z.infer<typeof settingsSchema>;
const overrideSchema = z.object({ enabled: z.boolean(), settings: settingsSchema }).strict();
export const siteDesignSchema = z.object({ version: z.literal(1), customized: z.boolean(), global: settingsSchema, pages: z.object({ home: overrideSchema, live: overrideSchema, movies: overrideSchema, news: overrideSchema, sports: overrideSchema, islamic: overrideSchema, series: overrideSchema, kids: overrideSchema, general: overrideSchema, movieChannels: overrideSchema }).strict() }).strict();
export type SiteDesign = z.infer<typeof siteDesignSchema>;
export function defaultDesign(): SiteDesign {
  const settings: DesignSettings = {
    colors: { background: "#070d24", surface: "#0e1734", text: "#f5f2e8", muted: "#a5b3cc", primary: "#d5ae42", buttonText: "#091127", border: "#786638", neon: "#57beee", shadow: "#030715", gradientEnd: "#15285c" },
    typography: { font: "original", size: 16, titleSize: 24, weight: "700", align: "right" },
    labels: { home: "الرئيسية", live: "البث المباشر", movies: "الأفلام", series: "المسلسلات", news: "الإخبارية", sports: "الرياضية", islamic: "الإسلامية", kids: "أطفال ووثائقي", general: "عامة", movieChannels: "أفلام كاملة" },
    images: { background: "", logo: "", wolf: "", live: "", movies: "", series: "", shield: "" },
    layout: { maxWidth: 1280, playerWidth: 1024, ratio: "16/9", gap: 24, radius: 16, cardHeight: 240, logoHeight: 144, logoPosition: "center", columns: 3, stageHeight: 320 },
    visible: { logo: true, wolf: true, cards: true, lists: true, icons: true, nav: true, header: true },
    effects: { glow: 22, shadow: 30, transition: 220, animation: "fade", gradient: false }, elements: [],
  };
  const pages = Object.fromEntries(designPages.map((page) => [page, { enabled: false, settings: structuredClone(settings) }])) as SiteDesign["pages"];
  return { version: 1, customized: false, global: settings, pages };
}
export function resolveDesign(design: SiteDesign, page: DesignPage): DesignSettings { return design.pages[page].enabled ? design.pages[page].settings : design.global; }
export function clampElement(element: DesignElement): DesignElement {
  const width = Math.max(5, Math.min(100, element.width));
  const height = Math.max(5, Math.min(100, element.height));
  return { ...element, width, height, x: Math.max(0, Math.min(100 - width, element.x)), y: Math.max(0, Math.min(100 - height, element.y)) };
}