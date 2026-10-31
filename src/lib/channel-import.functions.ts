import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdminSession } from "./channel-admin.server";

const privateHost = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd]|\[?fe80)/i;

/** Admin-only: downloads a public playlist (M3U/CSV) by link so the browser can preview it. */
export const fetchPlaylistFromUrl = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ url: z.string().trim().url().max(2000) }).parse(input))
  .handler(async ({ data }) => {
    await requireAdminSession();
    const url = new URL(data.url);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("الرابط يجب أن يبدأ بـ http أو https");
    if (privateHost.test(url.hostname) || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) throw new Error("هذا الرابط غير مسموح");
    let res: Response;
    try {
      res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0 ALMOGHANI-Importer" } });
    } catch { throw new Error("تعذّر الوصول إلى الرابط. تأكد أنه يعمل."); }
    if (!res.ok) throw new Error(`الرابط رد بخطأ (${res.status})`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("الرابط فارغ");
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024) { await reader.cancel(); throw new Error("القائمة أكبر من 5 ميجابايت"); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength; }
    const text = new TextDecoder().decode(bytes);
    if (!text.trim()) throw new Error("الرابط فارغ");
    return { text, name: url.pathname.split("/").pop() || url.hostname };
  });
