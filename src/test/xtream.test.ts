import { describe, expect, it } from "vitest";
import { credentialsSchema, normalizeRows } from "../lib/xtream";
import { passwordMatches } from "../lib/channel-admin.server";
import { channelDisplayName } from "../lib/channel-names";

describe("subscription rules", () => {
  it("accepts provider IDs and preserves categories and order", () => {
    expect(normalizeRows([{ stream_id: 81, name: "قناة" }, { stream_id: 12, name: "أخبار", category_id: "3" }], { "3": "إخبارية" }, "live")).toEqual([
      { remote_id: "81", name: "قناة", category: "عام", position: 0, season: 0, episode: 0, extension: "m3u8" },
      { remote_id: "12", name: "أخبار", category: "إخبارية", position: 1, season: 0, episode: 0, extension: "m3u8" },
    ]);
  });
  it("retains seasons and episodes", () => expect(normalizeRows([{ id: "5", title: "حلقة", season: 2, episode_num: 3 }], {}, "episode")[0]).toMatchObject({ remote_id: "5", season: 2, episode: 3 }));
  it("rejects private and insecure credential destinations", () => {
    for (const server of ["https://127.0.0.1", "https://10.1.1.1", "http://provider.example", "https://provider.example/?password=x"]) expect(() => credentialsSchema.parse({ server, username: "fixture", password: "fixture" })).toThrow();
  });
  it("rejects duplicate source IDs", () => expect(() => normalizeRows([{ stream_id: 1, name: "a" }, { stream_id: 1, name: "b" }], {}, "live")).toThrow());
  it("validates the opening PIN on the server", () => { expect(passwordMatches("fixture-123", "fixture-123")).toBe(true); expect(passwordMatches("wrong", "fixture-123")).toBe(false); });
});
describe("channel names", () => {
  it("removes trailing and repeated whitespace", () => expect(channelDisplayName("  قناة   عربية  \u200f")).toBe("قناة عربية"));
  it("uses Arabic for known Arabic stations", () => expect(channelDisplayName(" Al Jazeera ")).toBe("الجزيرة"));
  it("translates Arabic stations while retaining quality labels", () => expect(channelDisplayName("Al Ekhbariya (360p)  ")).toBe("السعودية الإخبارية (360p)"));
  it("preserves foreign station identity", () => expect(channelDisplayName("BBC News")).toBe("BBC News"));
});