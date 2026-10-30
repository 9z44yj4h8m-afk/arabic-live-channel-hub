import { createFileRoute } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";
import { publicChannelsQuery } from "@/lib/channel-catalog.query";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicChannelsQuery),
  head: () => ({
    meta: [
      { title: "ALMOGHANI IPTV — الرئيسية" },
      {
        name: "description",
        content: "اختر البث المباشر أو الأفلام أو المسلسلات من الصفحة الرئيسية لتطبيق ALMOGHANI IPTV.",
      },
      { property: "og:title", content: "ALMOGHANI IPTV — الرئيسية" },
      {
        property: "og:description",
        content: "البث المباشر والأفلام والمسلسلات في أقسام مستقلة داخل ALMOGHANI IPTV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PortalPage view="home" />,
});

