import { z } from "zod";
export const credentialsSchema = z.object({ server: z.string().url().max(1000).transform(value => {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || !/^\/?$/.test(url.pathname) || !url.hostname.includes(".") || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/i.test(url.hostname) || /\.(local|internal)$/.test(url.hostname)) throw new Error("استخدم عنوان خادم عامًا صحيحًا مثل http://server.com:8080");
  return url.origin;
}), username: z.string().trim().min(1).max(200), password: z.string().min(1).max(200) });
export type Credentials = z.infer<typeof credentialsSchema>;
export const kindSchema = z.enum(["live", "movie", "series", "episode"]);
export type XtreamKind = z.infer<typeof kindSchema>;
export type XtreamRow = { remote_id: string; name: string; category: string; position: number; season: number; episode: number; extension: string };
export function normalizeRows(input: unknown, categories: Record<string, string>, kind: XtreamKind): XtreamRow[] {
  const list = z.array(z.record(z.unknown())).max(20000).parse(input);
  const ids = new Set<string>();
  return list.map((r, position) => {
    const remote_id = String(r['stream_id'] ?? r['series_id'] ?? r['id'] ?? "");
    if (!/^\d+$/.test(remote_id) || ids.has(remote_id)) throw new Error("قائمة الاشتراك تتضمن معرفات غير صالحة أو مكررة");
    ids.add(remote_id);
    const ext = String(r['container_extension'] ?? "mp4");
    if (!/^(mp4|mkv|avi|ts|m3u8|mov|webm|flv|m4v)$/.test(ext)) throw new Error("صيغة بث غير مدعومة");
    return { remote_id, name: z.string().min(1).max(500).parse(r['name'] ?? r['title']), category: categories[String(r['category_id'])] ?? "عام", position, season: Number(r['season'] ?? 0), episode: Number(r['episode_num'] ?? 0), extension: kind === "live" ? "m3u8" : ext };
  });
}