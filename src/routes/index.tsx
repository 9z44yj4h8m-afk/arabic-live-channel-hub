import { createFileRoute } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI LIVE — بث مباشر" },
      {
        name: "description",
        content: "شاهد القنوات المباشرة داخل ALMOGHANI LIVE بواجهة عربية سريعة وواضحة.",
      },
      { property: "og:title", content: "ALMOGHANI LIVE — بث مباشر" },
      {
        property: "og:description",
        content: "مشاهدة القنوات المباشرة من مشغّل واحد داخل الموقع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://i.ytimg.com/vi/bNyUyrR0PHo/hqdefault.jpg" },
      { name: "twitter:image", content: "https://i.ytimg.com/vi/bNyUyrR0PHo/hqdefault.jpg" },
    ],
  }),
  component: () => <PortalPage />,
});

