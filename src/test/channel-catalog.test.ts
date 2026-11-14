import { describe, expect, it } from "vitest";
import { activeChannels, moveEntry, moveEntryToRank, seedEntries, channelFromForm, saveCatalogSchema } from "@/lib/channel-catalog";

describe("channel administration", () => {
  it("can save every existing channel including the existing HLS relay links", () => {
    expect(saveCatalogSchema.safeParse({ revision: 0, entries: seedEntries() }).success).toBe(true);
  });
  it("adds a user-supplied channel", () => {
    const channel = channelFromForm("اختبار", "إخبارية", "https://youtu.be/bNyUyrR0PHo", "", "");
    expect(activeChannels([{ channel, position: 0, deleted: false }])[0]?.youtubeId).toBe("bNyUyrR0PHo");
  });
  it("deleted channels are not public", () => {
    const entries = seedEntries();
    const id = entries[0]?.channel.id;
    expect(activeChannels(entries.map((e, i) => ({ ...e, deleted: i === 0 }))).some((c) => c.id === id)).toBe(false);
  });
  it("restores a deleted channel in its original position", () => {
    const entries = seedEntries().map((e, i) => ({ ...e, deleted: i === 0 }));
    expect(activeChannels(entries.map((e) => ({ ...e, deleted: false })))[0]?.id).toBe("aljazeera");
  });
  it("moves a channel up within its section", () => {
    expect(activeChannels(moveEntry(seedEntries(), "alarabiya", -1))[0]?.id).toBe("alarabiya");
  });
  it("moves a channel directly to the entered section rank without changing other sections", () => {
    const entries = seedEntries();
    const moved = moveEntryToRank(entries, "alarabiya", 1);
    expect(activeChannels(moved).filter(c => c.category === "إخبارية")[0]?.id).toBe("alarabiya");
    expect(moved.filter(e => e.channel.category !== "إخبارية").map(e => e.channel.id)).toEqual(entries.filter(e => e.channel.category !== "إخبارية").map(e => e.channel.id));
    expect(saveCatalogSchema.safeParse({ revision: 1, entries: moved }).success).toBe(true);
  });
  it("hidden channels are not shown on the display screen", () => {
    const entries = seedEntries();
    const id = entries[0]?.channel.id;
    expect(activeChannels(entries.map((e, i) => ({ ...e, hidden: i === 0 }))).some((c) => c.id === id)).toBe(false);
    expect(activeChannels(entries).some((c) => c.id === id)).toBe(true);
  });
  it("rejects invalid save input and duplicate ids", () => {
    const first = seedEntries()[0];
    expect(saveCatalogSchema.safeParse({ revision: 0, entries: [first, first] }).success).toBe(false);
  });
});