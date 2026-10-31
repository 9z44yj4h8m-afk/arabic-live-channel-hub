import { describe, expect, it } from "vitest";
import { addSection, defaultSections, editChannel, moveSection, removeSection, sectionsSchema } from "@/lib/catalog-sections";
import { seedEntries, saveCatalogSchema } from "@/lib/channel-catalog";

describe("section and channel management", () => {
  it("adds a section with its own permanent slug", () => {
    const result = addSection(defaultSections(), "ثقافية");
    expect(result.at(-1)?.title).toBe("ثقافية");
    expect(result.at(-1)?.slug).toMatch(/^section-/);
    expect(result.length).toBe(8);
  });
  it("rejects duplicate section names", () => {
    expect(() => addSection(defaultSections(), " الرياضية ")).toThrow();
  });
  it("reorders sections without changing their identity", () => {
    const result = moveSection(defaultSections(), "sports", -1);
    expect(result[0]?.slug).toBe("sports");
    expect(result[0]?.category).toBe("رياضية");
  });
  it("deletes a section while preserving every channel and source", () => {
    const entries = seedEntries();
    const result = removeSection(defaultSections(), entries, "news", "عامة");
    expect(result.sections.find((s) => s.slug === "news")?.deleted).toBe(true);
    expect(result.sections.find((s) => s.slug === "news")?.redirectTo).toBe("general");
    expect(result.entries.length).toBe(entries.length);
    expect(result.entries.find((e) => e.channel.id === "aljazeera")?.channel.category).toBe("عامة");
    expect(result.entries.map((e) => e.deleted)).toEqual(entries.map((e) => e.deleted));
    expect(result.entries.map((e) => e.channel.youtubeId)).toEqual(entries.map((e) => e.channel.youtubeId));
  });
  it("rejects deleting the final section or moving into itself", () => {
    expect(sectionsSchema.safeParse(defaultSections().map((s) => ({ ...s, deleted: true }))).success).toBe(false);
    expect(() => removeSection(defaultSections(), seedEntries(), "news", "إخبارية")).toThrow();
  });
  it("renames and moves a channel preserving its ID and stream", () => {
    const original = seedEntries();
    const result = editChannel(original, "aljazeera", "الجزيرة الجديدة", "رياضية");
    const channel = result.find((e) => e.channel.id === "aljazeera")?.channel;
    expect(channel?.name).toBe("الجزيرة الجديدة");
    expect(channel?.category).toBe("رياضية");
    expect(channel?.youtubeId).toBe("bNyUyrR0PHo");
    expect(saveCatalogSchema.safeParse({ entries: result, revision: 0, sections: defaultSections() }).success).toBe(true);
  });
});