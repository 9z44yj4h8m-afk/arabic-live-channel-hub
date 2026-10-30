import { createHash, timingSafeEqual } from "node:crypto";
import { useSession, setResponseHeader } from "@tanstack/react-start/server";

export function passwordMatches(input: string, expected: string) {
  return timingSafeEqual(createHash("sha256").update(input).digest(), createHash("sha256").update(expected).digest());
}

export async function adminSession() {
  const password = process.env["CHANNEL_ADMIN_SESSION_SECRET"];
  if (!password) throw new Error("تعذّر فتح لوحة الإدارة.");
  setResponseHeader("Cache-Control", "no-store");
  return useSession<{ unlocked?: boolean; passwordVersion?: string }>({
    password, name: "channel-admin", maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}

export function passwordVersion() {
  const password = process.env["CHANNEL_ADMIN_PASSWORD"];
  if (!password) throw new Error("تعذّر فتح لوحة الإدارة.");
  return createHash("sha256").update(password).digest("hex");
}

export async function requireAdminSession() {
  const session = await adminSession();
  if (session.data.unlocked !== true || session.data.passwordVersion !== passwordVersion()) throw new Error("أدخل الرقم السري لفتح لوحة الإدارة.");
  return session;
}