import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Resolve the video ID of a YouTube channel's current live broadcast, so the
 * player can follow a channel when it ends one stream and starts another.
 * Returns null when the channel is not live or does not allow embedding.
 */
export const resolveYoutubeLive = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ channelId: z.string().regex(/^UC[\w-]{22}$/) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(`https://www.youtube.com/channel/${data.channelId}/live`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          "Accept-Language": "en",
          Cookie: "SOCS=CAI; CONSENT=YES+",
        },
      });
      if (!res.ok) return { videoId: null as string | null };
      const html = await res.text();
      const match = html.match(
        /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/,
      );
      const embeddable = html.includes('"playableInEmbed":true');
      return { videoId: match && embeddable ? match[1] : null };
    } catch {
      return { videoId: null as string | null };
    }
  });
