import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { credentialsSchema, type Credentials } from "./xtream";

function key() {
  const secret = process.env["XTREAM_ENCRYPTION_KEY"];
  if (!secret) throw new Error("تعذّر فتح الاشتراك");
  return createHash("sha256").update(secret).digest();
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes].map(b => b.toString("base64url")).join(".");
}
export function decrypt(value: string): unknown {
  const parts = value.split("."); const [iv, tag, bytes] = parts;
  if (parts.length !== 3 || !iv || !tag || !bytes) throw new Error("تعذّر فتح الاشتراك");
  const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url")); cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(bytes, "base64url")), cipher.final()]).toString("utf8"));
}
export async function connection() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("xtream_connections").select("encrypted_credentials,revision").eq("id", 1).maybeSingle();
  if (error || !data) throw new Error("أضف اشتراكك أولًا من لوحة الإدارة");
  return { credentials: credentialsSchema.parse(decrypt(data.encrypted_credentials)), revision: data.revision, db: supabaseAdmin };
}
export async function provider(credentials: Credentials, action?: string, seriesId?: string): Promise<unknown> {
  const url = new URL("/player_api.php", credentials.server); url.searchParams.set("username", credentials.username); url.searchParams.set("password", credentials.password);
  if (action) url.searchParams.set("action", action); if (seriesId) url.searchParams.set("series_id", seriesId);
  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error();
    const text = await response.text(); if (text.length > 20 * 1024 * 1024) throw new Error();
    return JSON.parse(text);
  } catch { throw new Error("تعذّر الاتصال بمزوّد الاشتراك؛ تحقق من العنوان وبيانات الدخول"); }
}