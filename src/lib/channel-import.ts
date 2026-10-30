import Papa from "papaparse";
import playlistParser from "iptv-playlist-parser";
import { categories, channelFromForm, type CatalogEntry } from "./channel-catalog";
import type { Channel, ChannelCategory } from "./channels";

export type ImportRow = { name: string; link: string; group: string; thumbnail: string; description: string; line: number; issue?: string };
export type CsvField = "name" | "link" | "group" | "thumbnail" | "description";
export type ImportFile = { format: "csv" | "m3u"; headers: string[]; cells: string[][]; rows: ImportRow[]; mapping: Record<CsvField, number> };
const aliases: Record<CsvField, string[]> = {
  name: ["name", "channel", "channelname", "اسم", "اسم القناة", "القناة"],
  link: ["url", "link", "streamurl", "رابط", "رابط البث", "الرابط"],
  group: ["category", "group", "group-title", "القسم", "التصنيف", "الفئة"],
  thumbnail: ["thumbnail", "logo", "tvg-logo", "الصورة", "رابط الصورة"],
  description: ["description", "الوصف", "وصف"],
};
export function mapCsv(file: Pick<ImportFile, "cells" | "mapping">): ImportRow[] {
  return file.cells.map((cells, index) => {
    const value = (key: CsvField) => cells[file.mapping[key]]?.trim() || "";
    return { name: value("name"), link: value("link"), group: value("group"), thumbnail: value("thumbnail"), description: value("description"), line: index + 2 };
  });
}
export function parseImportFile(text: string): ImportFile {
  const source = text.replace(/^\uFEFF/, "").trim();
  if (!source) throw new Error("الملف فارغ.");
  const mapping = { name: -1, link: -1, group: -1, thumbnail: -1, description: -1 };
  if (source.startsWith("#EXTM3U")) {
    if (/^#EXT-X-/m.test(source)) throw new Error("هذا ملف تشغيل بث واحد، وليس قائمة قنوات.");
    const rows = playlistParser.parse(source).items.map((item) => ({
      name: item.name, link: item.url, group: item.group.title, thumbnail: item.tvg.logo,
      description: "", line: item.line,
      ...(item.http.referrer || item.http["user-agent"] ? { issue: "يتطلب البث إعدادات اتصال خاصة؛ أضفه يدويًا بعد التحقق." } : {}),
    }));
    if (!rows.length) throw new Error("لم توجد قنوات في القائمة.");
    return { format: "m3u", headers: [], cells: [], rows, mapping };
  }
  const result = Papa.parse<string[]>(source, { skipEmptyLines: "greedy" });
  if (result.errors.some((error) => error.code !== "UndetectableDelimiter")) throw new Error("تعذّر قراءة CSV؛ تحقق من الفواصل وعلامات الاقتباس.");
  const [headers, ...cells] = result.data;
  if (!headers || !cells.length) throw new Error("ملف CSV يحتاج عناوين أعمدة وصفوف قنوات.");
  for (const key of Object.keys(aliases) as CsvField[]) mapping[key] = headers.findIndex((header) => aliases[key].includes(header.trim().toLowerCase().replace(/^\uFEFF/, "")));
  const file: ImportFile = { format: "csv", headers, cells, rows: [], mapping };
  file.rows = mapCsv(file);
  return file;
}
export function importCategory(group: string, fallback: ChannelCategory): ChannelCategory {
  const exact = categories.find((category) => category === group.trim());
  if (exact) return exact;
  const normalized = group.toLowerCase();
  if (/news|إخبار|اخبار|أخبار/.test(normalized)) return "إخبارية";
  if (/sport|رياض/.test(normalized)) return "رياضية";
  if (/islam|relig|quran|قرآن|قران|إسلام|اسلام|دين/.test(normalized)) return "إسلامية";
  if (/series|مسلسل|دراما/.test(normalized)) return "مسلسلات وأفلام";
  if (/movie|cinema|أفلام|افلام/.test(normalized)) return "أفلام كاملة";
  if (/kids|child|documentary|أطفال|اطفال|وثائق/.test(normalized)) return "أطفال ووثائقي";
  return fallback;
}
export function channelSource(channel: Channel): string {
  return channel.youtubeId ? `video:${channel.youtubeId}` : channel.youtubeChannelId ? `channel:${channel.youtubeChannelId}` : `stream:${channel.streamUrl}`;
}
export function previewImport(rows: ImportRow[], existing: CatalogEntry[], fallback: ChannelCategory) {
  const sources = new Set(existing.map((entry) => channelSource(entry.channel)));
  return rows.map((row) => {
    const category = importCategory(row.group, fallback);
    try {
      if (row.issue) throw new Error(row.issue);
      const channel = channelFromForm(row.name, category, row.link, row.description, row.thumbnail);
      const source = channelSource(channel);
      if (sources.has(source)) return { row, category, channel, issue: "مكررة في القائمة أو الملف" };
      sources.add(source);
      return { row, category, channel, issue: "" };
    } catch {
      return { row, category, channel: undefined, issue: row.issue || "اسم أو رابط غير صالح؛ يلزم HTTPS ورابط يوتيوب صالح" };
    }
  });
}
export function appendImportedChannels(entries: CatalogEntry[], channels: Channel[]): CatalogEntry[] {
  const sources = new Set(entries.map((entry) => channelSource(entry.channel)));
  const next = [...entries];
  let position = Math.max(-1, ...entries.map((entry) => entry.position)) + 1;
  for (const channel of channels) {
    const source = channelSource(channel);
    if (sources.has(source)) continue;
    sources.add(source);
    next.push({ channel, position: position++, deleted: false, hidden: false });
  }
  if (next.length > 2000) throw new Error("الحد الأقصى للقائمة 2000 قناة، بما فيها المحذوفة.");
  return next;
}