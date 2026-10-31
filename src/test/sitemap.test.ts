import { describe, expect, it } from "vitest";
import { isSitemapRouteIncluded, sitemapXML } from "../lib/sitemap";
import type { AnyRoute } from "@tanstack/react-router";
describe("public discovery boundary", () => {
  it("includes only routes explicitly marked public", () => {
    const route = (value: boolean) => ({ isRoot: false, options: { staticData: { sitemap: value } } }) as unknown as AnyRoute;
    expect(isSitemapRouteIncluded(route(true))).toBe(true);
    expect(isSitemapRouteIncluded(route(false))).toBe(false);
  });
  it("renders the public homepage without generated modification dates", () => {
    const xml = sitemapXML("https://arabic-live-channel-hub.lovable.app", [{ path: "/" }]);
    expect(xml).toContain("<loc>https://arabic-live-channel-hub.lovable.app/</loc>");
    expect(xml).not.toContain("lastmod");
  });
});