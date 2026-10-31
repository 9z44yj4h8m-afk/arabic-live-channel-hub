import { z } from "zod";
import { channels, type Channel } from "./channels";
import { sectionsSchema } from "./catalog-sections";
import { channelDisplayName } from "./channel-names";

export const categories = ["إخبارية", "رياضية", "إسلامية", "مسلسلات وأفلام", "أفلام كاملة", "أطفال ووثائقي", "عامة"] as const;
const httpsUrl = z.string().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}, "استخدم رابط HTTPS صالحًا");
const existingRelay = z.string().refine((value) => channels.some((c) => c.streamUrl === value && value.startsWith("/api/public/hls?u=")), "رابط بث غير صالح");
export const channelSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().transform(channelDisplayName).pipe(z.string().min(1).max(120)),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  thumbnail: z.union([httpsUrl, z.literal("/icon-192.png")]),
  youtubeId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/).optional(),
  youtubeChannelId: z.string().regex(/^UC[a-zA-Z0-9_-]{22}$/).optional(),
  streamUrl: z.union([httpsUrl, existingRelay]).optional(),
}).refine((c) => Boolean(c.youtubeId || c.youtubeChannelId || c.streamUrl), "أضف رابط بث أو يوتيوب");
export type CatalogEntry = { channel: Channel; position: number; deleted: boolean; hidden?: boolean };
export const saveCatalogSchema = z.object({
  revision: z.number().int().nonnegative(),
  sections: sectionsSchema.optional(),
  entries: z.array(z.object({ channel: channelSchema, position: z.number().int().nonnegative(), deleted: z.boolean(), hidden: z.boolean().optional() })).max(15000),
}).refine(({ entries }) => new Set(entries.map((e) => e.channel.id)).size === entries.length, "معرّف قناة مكرر");
export function seedEntries(): CatalogEntry[] {
  return channels.map((channel, position) => ({ channel, position, deleted: false }));
}
export function activeChannels(entries: CatalogEntry[]) {
  return [...entries].sort((a, b) => a.position - b.position).filter((e) => !e.deleted && !e.hidden).map((e) => ({ ...e.channel, name: channelDisplayName(e.channel.name) }));
}
export function moveEntry(entries: CatalogEntry[], id: string, direction: -1 | 1): CatalogEntry[] {
  const result = [...entries].sort((a, b) => a.position - b.position);
  const index = result.findIndex((e) => e.channel.id === id);
  const current = result[index];
  if (!current) return result;
  let next = index + direction;
  while (next >= 0 && next < result.length) {
    const candidate = result[next];
    if (candidate && !candidate.deleted && candidate.channel.category === current.channel.category) break;
    next += direction;
  }
  const target = result[next];
  if (!target) return result;
  result[index] = target;
  result[next] = current;
  return result.map((e, position) => ({ ...e, position }));
}
export function channelFromForm(name: string, category: Channel["category"], link: string, description: string, thumbnail: string): Channel {
  const url = new URL(link.trim());
  let youtubeId: string | undefined;
  let youtubeChannelId: string | undefined;
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(url.hostname)) {
    youtubeId = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? undefined;
    if (url.pathname.startsWith("/live/")) youtubeId = url.pathname.split("/")[2];
    if (url.pathname.startsWith("/channel/")) youtubeChannelId = url.pathname.split("/")[2];
    if (!youtubeId && !youtubeChannelId) throw new Error("استخدم رابط فيديو يوتيوب أو رابط القناة الذي يحتوي على /channel/UC");
  }
  const parsed = channelSchema.parse({
    id: crypto.randomUUID(), name, category, description,
    thumbnail: thumbnail.trim() || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "/icon-192.png"),
    ...(youtubeId ? { youtubeId } : {}), ...(youtubeChannelId ? { youtubeChannelId } : {}),
    ...(!youtubeId && !youtubeChannelId ? { streamUrl: url.href } : {}),
  });
  return {
    id: parsed.id, name: parsed.name, category: parsed.category, description: parsed.description, thumbnail: parsed.thumbnail,
    ...(parsed.youtubeId ? { youtubeId: parsed.youtubeId } : {}),
    ...(parsed.youtubeChannelId ? { youtubeChannelId: parsed.youtubeChannelId } : {}),
    ...(parsed.streamUrl ? { streamUrl: parsed.streamUrl } : {}),
  };
}