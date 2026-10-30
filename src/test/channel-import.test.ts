import { describe, expect, it } from "vitest";
import { appendImportedChannels, mapCsv, parseImportFile, previewImport } from "@/lib/channel-import";
import { channelFromForm, saveCatalogSchema, type CatalogEntry } from "@/lib/channel-catalog";

describe("channel file imports", () => {
  it("reads Arabic CSV, quoted commas, BOM and category columns", () => {
    const file = parseImportFile('\uFEFFاسم القناة,رابط البث,القسم\r\n"قناة, الأخبار",https://example.com/news.m3u8,News');
    const preview = previewImport(file.rows, [], "عامة");
    expect(preview[0]?.channel?.name).toBe("قناة, الأخبار");
    expect(preview[0]?.channel?.streamUrl).toBe("https://example.com/news.m3u8");
    expect(preview[0]?.category).toBe("إخبارية");
  });
  it("supports mapping unknown CSV headings", () => {
    const file = parseImportFile("title;address\nاختبار;https://example.com/live.m3u8");
    const rows = mapCsv({ ...file, mapping: { ...file.mapping, name: 0, link: 1 } });
    expect(previewImport(rows, [], "رياضية")[0]?.channel?.category).toBe("رياضية");
  });
  it("reads M3U names, logos, groups and YouTube IDs", () => {
    const file = parseImportFile('#EXTM3U\n#EXTINF:-1 tvg-logo="https://example.com/logo.png" group-title="Kids",أطفال\nhttps://youtu.be/bNyUyrR0PHo');
    const channel = previewImport(file.rows, [], "عامة")[0]?.channel;
    expect(channel?.category).toBe("أطفال ووثائقي");
    expect(channel?.thumbnail).toBe("https://example.com/logo.png");
    expect(channel?.youtubeId).toBe("bNyUyrR0PHo");
  });
  it("skips duplicate sources in files and existing deleted channels", () => {
    const channel = channelFromForm("موجودة", "عامة", "https://youtu.be/bNyUyrR0PHo", "", "");
    const entries: CatalogEntry[] = [{ channel, position: 5, deleted: true }];
    const file = parseImportFile("name,url\nمكررة,https://www.youtube.com/watch?v=bNyUyrR0PHo\nجديدة,https://example.com/live.m3u8\nمكررة ثانية,https://example.com/live.m3u8");
    const preview = previewImport(file.rows, entries, "عامة");
    expect(preview.map((item) => Boolean(item.issue))).toEqual([true, false, true]);
    const added = preview[1]?.channel;
    if (!added) throw new Error("Expected valid channel");
    const next = appendImportedChannels(entries, [added, added, channel]);
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(entries[0]);
    expect(next[1]?.position).toBe(6);
    expect(next[1]?.hidden).toBe(false);
    expect(saveCatalogSchema.safeParse({ entries: next, revision: 0 }).success).toBe(true);
  });
  it("rejects invalid links without changing valid rows", () => {
    const file = parseImportFile("name,url\nغير آمنة,http://example.com/a\nفارغة,\nآمنة,https://example.com/live.m3u8");
    expect(previewImport(file.rows, [], "عامة").map((item) => Boolean(item.channel))).toEqual([false, false, true]);
  });
  it("does not silently import streams that require unsupported request headers", () => {
    const file = parseImportFile('#EXTM3U\n#EXTINF:-1,خاصة\n#EXTVLCOPT:http-referrer=https://example.com/\nhttps://example.com/private.m3u8');
    expect(previewImport(file.rows, [], "عامة")[0]?.channel).toBeUndefined();
  });
  it("rejects single-stream HLS manifests and empty files", () => {
    expect(() => parseImportFile("#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nsegment.ts")).toThrow();
    expect(() => parseImportFile("")).toThrow();
  });
  it("respects the existing 2000-entry catalog capacity", () => {
    const channel = channelFromForm("اختبار", "عامة", "https://example.com/live.m3u8", "", "");
    const entries: CatalogEntry[] = Array.from({ length: 2000 }, (_, position) => ({ channel, position, deleted: true }));
    const extra = channelFromForm("جديدة", "عامة", "https://example.com/new.m3u8", "", "");
    expect(() => appendImportedChannels(entries, [extra])).toThrow();
  });
});