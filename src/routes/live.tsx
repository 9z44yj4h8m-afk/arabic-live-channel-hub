import { createFileRoute } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";
import { publicChannelsQuery } from "@/lib/channel-catalog.query";

export const Route = createFileRoute("/live")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicChannelsQuery),
  head: () => ({
    meta: [
      { title: "البث المباشر — ALMOGHANI LIVE" },
      { name: "description", content: "كل قنوات البث المباشر في مشغّل واحد داخل ALMOGHANI LIVE." },
      { property: "og:title", content: "البث المباشر — ALMOGHANI LIVE" },
      { property: "og:description", content: "اختر قناة وشاهدها مباشرة داخل الموقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalPage view="live" />,
});
