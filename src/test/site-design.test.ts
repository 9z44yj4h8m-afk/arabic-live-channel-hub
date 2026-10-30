import { describe, expect, it } from "vitest";
import { clampElement, defaultDesign, elementSchema, resolveDesign, safeImageUrl, siteDesignSchema } from "@/lib/site-design";

describe("site design validation", () => {
  it("preserves original styling until explicitly customized", () => {
    const design = defaultDesign();
    expect(design.customized).toBe(false);
    expect(siteDesignSchema.safeParse(design).success).toBe(true);
    expect(Object.values(design.pages).every((page) => !page.enabled)).toBe(true);
  });
  it("resolves page overrides without mutating shared settings", () => {
    const design = defaultDesign();
    design.pages.movies.enabled = true;
    design.pages.movies.settings.colors.primary = "#123456";
    expect(resolveDesign(design, "movies").colors.primary).toBe("#123456");
    expect(resolveDesign(design, "home").colors.primary).toBe("#d5ae42");
  });
  it("rejects unsafe image schemes, credentials and CSS escape characters", () => {
    for (const value of ["javascript:alert(1)", "data:image/svg+xml,test", "http://example.com/a.png", "https://user:pass@example.com/a", 'https://example.com/a");color:red', "https://localhost/a"]) expect(safeImageUrl.safeParse(value).success).toBe(false);
    expect(safeImageUrl.safeParse("https://example.com/logo.png").success).toBe(true);
    expect(safeImageUrl.safeParse("").success).toBe(true);
  });
  it("rejects arbitrary HTML/CSS/JS configuration fields and malformed colors", () => {
    const design = defaultDesign();
    expect(siteDesignSchema.safeParse({ ...design, css: "body {display:none}" }).success).toBe(false);
    expect(siteDesignSchema.safeParse({ ...design, global: { ...design.global, colors: { ...design.global.colors, primary: "red; background:url(x)" } } }).success).toBe(false);
  });
  it("keeps visual elements inside their safe stage", () => {
    const element = { id: crypto.randomUUID(), type: "text" as const, text: "ALMOGHANI", image: "", color: "#ffffff", background: "#000000", x: 90, y: 95, width: 50, height: 40, fontSize: 20, radius: 8 };
    expect(elementSchema.safeParse(element).success).toBe(false);
    const next = clampElement(element);
    expect(next.x).toBe(50); expect(next.y).toBe(60);
    expect(elementSchema.safeParse(next).success).toBe(true);
  });
  it("rejects oversized settings and unbounded dimensions", () => {
    const design = defaultDesign();
    design.global.layout.maxWidth = 100000;
    expect(siteDesignSchema.safeParse(design).success).toBe(false);
    design.global.layout.maxWidth = 1280;
    design.global.labels.home = "x".repeat(121);
    expect(siteDesignSchema.safeParse(design).success).toBe(false);
  });
});