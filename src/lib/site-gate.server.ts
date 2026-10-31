import { createHash } from "node:crypto";
import { useSession, setResponseHeader } from "@tanstack/react-start/server";

export async function siteSession() {
  const password = process.env["SITE_SESSION_SECRET"];
  if (!password) throw new Error("تعذّر فتح التطبيق");
  setResponseHeader("Cache-Control", "no-store");
  return useSession<{ version?: string }>({ password, name: "almoghani-access", cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" } });
}
export function siteVersion() {
  const password = process.env["SITE_PASSWORD"];
  if (!password) throw new Error("تعذّر فتح التطبيق");
  return createHash("sha256").update(password).digest("hex");
}
export async function siteUnlocked() {
  return (await siteSession()).data.version === siteVersion();
}
export async function requireSiteSession() {
  if (!await siteUnlocked()) throw new Error("أدخل الرقم السري لفتح التطبيق");
}