import { createFileRoute } from "@tanstack/react-router";

// Rotana's CDN only serves video pieces when the request carries Referer: rotana.net,
// which browsers cannot set. This route relays only allow-listed stream hosts with that header
// and rewrites playlists so every nested request also goes through the relay.
const RULES: { host: string; referer: string }[] = [
  { host: "rotana.hibridcdn.net", referer: "https://rotana.net/" },
];

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
};

function proxied(url: string) {
  return `/api/public/hls?u=${encodeURIComponent(url)}`;
}

export const Route = createFileRoute("/api/public/hls")({ staticData: { sitemap: false },
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("u");
        let target: URL;
        try {
          target = new URL(raw ?? "");
        } catch {
          return new Response("Bad url", { status: 400, headers: CORS });
        }
        const rule = RULES.find((r) => r.host === target.hostname);
        if (target.protocol !== "https:" || !rule) {
          return new Response("Host not allowed", { status: 403, headers: CORS });
        }

        const upstream = await fetch(target.toString(), {
          headers: { Referer: rule.referer, "User-Agent": "Mozilla/5.0" },
        });
        if (!upstream.ok) {
          return new Response("Upstream error", { status: upstream.status, headers: CORS });
        }

        const isPlaylist = target.pathname.endsWith(".m3u8") ||
          (upstream.headers.get("content-type") ?? "").includes("mpegurl");

        if (isPlaylist) {
          const text = await upstream.text();
          const rewritten = text
            .split("\n")
            .map((line) => {
              const t = line.trim();
              if (!t) return line;
              if (t.startsWith("#")) {
                return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${proxied(new URL(u, target).toString())}"`);
              }
              return proxied(new URL(t, target).toString());
            })
            .join("\n");
          return new Response(rewritten, {
            headers: { ...CORS, "content-type": "application/vnd.apple.mpegurl", "cache-control": "private, no-store" },
          });
        }

        return new Response(upstream.body, {
          headers: {
            ...CORS,
            "content-type": upstream.headers.get("content-type") ?? "video/mp2t",
            "cache-control": "private, no-store",
          },
        });
      },
    },
  },
});
