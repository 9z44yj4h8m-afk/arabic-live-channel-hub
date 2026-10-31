import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { inputValidator: () => builder, handler: (handler: unknown) => handler };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ useSession: vi.fn(async () => ({ data: {} })), setResponseHeader: vi.fn() }));
vi.mock("@/lib/channel-catalog.server", () => ({
  publicCatalogClient: vi.fn(() => ({})),
  readCatalog: vi.fn(async () => ({ entries: [{ channel: { id: "public-channel", name: "قناة عامة" }, position: 0, hidden: false, deleted: false }] })),
}));
import { getPublicChannels, getAdminCatalog } from "@/lib/channel-catalog.functions";
import { getFeaturedMovies } from "@/lib/featured-movies.functions";
import { movies } from "@/lib/movies";

describe("viewing without a PIN", () => {
  it("returns active channels without a viewing or administrator session", async () => {
    const channels = await getPublicChannels();
    expect(channels.map(channel => channel.id)).toEqual(["public-channel"]);
  });
  it("returns movies without a viewing session even when the external source is unavailable", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    try { expect(await getFeaturedMovies()).toEqual(movies); }
    finally { fetchMock.mockRestore(); }
  });
  it("still denies administrator catalog access without the administrator session", async () => {
    await expect(getAdminCatalog()).rejects.toThrow("أدخل الرقم السري لفتح لوحة الإدارة");
  });
});