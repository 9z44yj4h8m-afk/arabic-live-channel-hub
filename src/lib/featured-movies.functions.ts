import { createServerFn } from "@tanstack/react-start";
import { movies as fallback, type Movie } from "./movies";

// Official channels that upload full movies. New uploads appear automatically.
const SOURCES = [
  { handle: "RotanaStudios", name: "Rotana Studios" },
  { handle: "sobkyproductions", name: "السبكي للإنتاج الفني" },
];

let cache: { at: number; list: Movie[] } | null = null;
const TTL = 60 * 60 * 1000;

type VR = {
  videoId: string;
  title?: { runs?: { text: string }[] };
  lengthText?: { simpleText?: string };
  publishedTimeText?: { simpleText?: string };
};

function collect(o: unknown, out: VR[]) {
  if (Array.isArray(o)) o.forEach((v) => collect(v, out));
  else if (o && typeof o === "object") {
    const r = o as Record<string, unknown>;
    if (r['videoRenderer']) out.push(r['videoRenderer'] as VR);
    for (const v of Object.values(r)) collect(v, out);
  }
}

function seconds(t: string) {
  return t.split(":").reduce((a, p) => a * 60 + Number(p), 0);
}

async function fromChannel(handle: string, name: string): Promise<Movie[]> {
  const res = await fetch(
    `https://www.youtube.com/@${handle}/search?query=${encodeURIComponent("فيلم")}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Accept-Language": "ar",
        Cookie: "SOCS=CAI; CONSENT=YES+",
      },
    },
  );
  if (!res.ok) return [];
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const found: VR[] = [];
  collect(JSON.parse(m[1]!), found);
  return found
    .filter((v) => {
      const len = v.lengthText?.simpleText ?? "";
      const title = v.title?.runs?.[0]?.text ?? "";
      return seconds(len) >= 60 * 60 && title.includes("فيلم");
    })
    .map((v) => {
      const raw = v.title?.runs?.[0]?.text ?? "";
      const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
      const title = (parts.length > 1 ? parts[1]! : raw).replace(/["“”]/g, "").slice(0, 60);
      const desc = parts.slice(2).join(" ").replace(/-?\s*Full HD/i, "").trim() || raw;
      return {
        id: v.videoId,
        youtubeId: v.videoId,
        title,
        duration: v.lengthText?.simpleText ?? "",
        description: desc,
        source: name,
        lang: "عربي" as const,
      };
    });
}

export const getFeaturedMovies = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < TTL) return cache.list;
  try {
    const lists = await Promise.all(SOURCES.map((s) => fromChannel(s.handle, s.name).catch(() => [])));
    const merged: Movie[] = [];
    // Interleave sources, then append the hand-picked list (incl. international titles).
    const max = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) merged.push(l[i]!);
    const list = [...merged, ...fallback].filter((m, i, a) => a.findIndex((x) => x.youtubeId === m.youtubeId) === i);
    if (list.length > fallback.length) cache = { at: Date.now(), list };
    return list;
  } catch {
    return fallback;
  }
});
