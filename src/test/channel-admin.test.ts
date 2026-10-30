import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({ useSession: vi.fn(), setResponseHeader: vi.fn() }));
import { passwordMatches, requireAdminSession } from "@/lib/channel-admin.server";
import { useSession } from "@tanstack/react-start/server";

describe("shared admin password", () => {
  it("accepts only the configured password", () => {
    const expected = process.env["CHANNEL_ADMIN_PASSWORD"];
    if (!expected) throw new Error("Admin password must be configured for this test");
    expect(passwordMatches(expected, expected)).toBe(true);
    expect(passwordMatches(`${expected}x`, expected)).toBe(false);
    expect(passwordMatches("", expected)).toBe(false);
  });
  it("denies catalog access without an unlocked session", async () => {
    vi.mocked(useSession).mockResolvedValue({ data: {} } as Awaited<ReturnType<typeof useSession>>);
    await expect(requireAdminSession()).rejects.toThrow("أدخل الرقم السري");
  });
});