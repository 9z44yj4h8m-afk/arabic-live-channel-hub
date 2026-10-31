import { describe, expect, it } from "vitest";
import { assertUniqueLabel, categoryLabelInput, defaultCategoryLabels, mergeLabels } from "./category-labels";

describe("category labels", () => {
  it("rejects a name used by another category", () => {
    expect(() => assertUniqueLabel(defaultCategoryLabels, "news", " الرياضية ")).toThrow("مستخدم");
  });
  it("allows keeping the same category's own name", () => {
    expect(() => assertUniqueLabel(defaultCategoryLabels, "news", "الإخبارية")).not.toThrow();
  });
  it("rejects empty, too long and markup names", () => {
    expect(categoryLabelInput.safeParse({ key: "news", label: "   " }).success).toBe(false);
    expect(categoryLabelInput.safeParse({ key: "news", label: "أ".repeat(41) }).success).toBe(false);
    expect(categoryLabelInput.safeParse({ key: "news", label: "<b>x</b>" }).success).toBe(false);
  });
  it("rejects unknown category keys", () => {
    expect(categoryLabelInput.safeParse({ key: "hack", label: "x" }).success).toBe(false);
  });
  it("overrides only saved keys", () => {
    const l = mergeLabels([{ key: "news", label: "أخبار" }, { key: "bad", label: "x" }]);
    expect(l.news).toBe("أخبار");
    expect(l.sports).toBe("الرياضية");
  });
});
