import { createFileRoute, notFound } from "@tanstack/react-router";
import { PortalPage } from "@/components/portal-page";
import { publicChannelsQuery } from "@/lib/channel-catalog.query";
import { catalogSectionsQuery } from "@/lib/catalog-sections.query";
import { categoryLabelsQuery } from "@/lib/category-labels.query";

export const Route = createFileRoute("/channels/$section")({
  loader: async ({ params, context }) => {
    const sections = await context.queryClient.ensureQueryData(catalogSectionsQuery);
    const s = sections.find((x) => x.slug === params.section);
    if (!s) throw notFound();
    const [, labels] = await Promise.all([context.queryClient.ensureQueryData(publicChannelsQuery), context.queryClient.ensureQueryData(categoryLabelsQuery)]);
    return { title: labels[s.slug === "movies" ? "movieChannels" : (s.slug as keyof typeof labels)] || s.title };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `قنوات ${loaderData.title} — ALMOGHANI LIVE` : "القسم غير موجود";
    const d = loaderData ? `شاهد قنوات ${loaderData.title} مباشرة داخل ALMOGHANI LIVE.` : "";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  return <PortalPage key={section} section={section} />;
}
