import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/xtream")({ staticData: { sitemap: false }, server: { handlers: { GET: async ({ request }) => {
  try {
    const { connection, encrypt, decrypt } = await import("@/lib/xtream.server");
    const { credentials, db } = await connection(); const params = new URL(request.url).searchParams;
    let url: URL;
    if (params.has("token")) {
      const { z } = await import("zod");
      const token = z.object({ url: z.string().url(), expires: z.number(), revision: z.number() }).parse(decrypt(params.get("token") ?? ""));
      const current = await connection();
      if (token.expires < Date.now() || token.revision !== current.revision) return new Response(null, { status: 403 });
      url = new URL(token.url);
    } else {
      const id = params.get("id") ?? ""; if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 400 });
      const { data: item, error } = await db.from("xtream_items").select("remote_id,kind,extension").eq("id", id).eq("hidden", false).eq("deleted", false).maybeSingle();
      if (error || !item || item.kind === "series" || !/^\d+$/.test(item.remote_id)) return new Response(null, { status: 404 });
      const prefix = item.kind === "episode" ? "series" : item.kind;
      url = new URL(`/${prefix}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${item.remote_id}.${item.extension}`, credentials.server);
    }
    if (url.origin !== credentials.server || url.username || url.password) return new Response(null, { status: 403 });
    const headers = new Headers(); const range = request.headers.get("range"); if (range) headers.set("range", range);
    const upstream = await fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(20000) });
    if (!upstream.ok) return new Response(null, { status: 502 });
    const type = upstream.headers.get("content-type") ?? "application/octet-stream";
    const output = new Headers({ "Cache-Control": "private, no-store", "Content-Type": type });
    if (/mpegurl/i.test(type) || url.pathname.endsWith(".m3u8")) {
      const text = await upstream.text(); if (text.length > 2 * 1024 * 1024) return new Response(null, { status: 502 });
      const current = await connection();
      function relay(path: string) {
        const target = new URL(path, url); if (target.origin !== credentials.server) throw new Error();
        return `/api/public/xtream?token=${encodeURIComponent(encrypt({ url: target.href, expires: Date.now() + 4 * 60 * 60 * 1000, revision: current.revision }))}`;
      }
      const body = text.split(/\r?\n/).map(line => line.startsWith("#") ? line.replace(/URI="([^"]+)"/g, (_, path: string) => `URI="${relay(path)}"`) : line.trim() ? relay(line.trim()) : line).join("\n");
      output.set("Content-Type", "application/vnd.apple.mpegurl"); return new Response(body, { headers: output });
    }
    for (const name of ["content-range", "accept-ranges", "content-length"]) { const value = upstream.headers.get(name); if (value) output.set(name, value); }
    return new Response(upstream.body, { status: upstream.status, headers: output });
  } catch { return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } }); }
} } } });