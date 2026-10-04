import { createFileRoute, notFound } from "@tanstack/react-router";
import { PortalPage, liveSections } from "@/components/portal-page";

export const Route = createFileRoute("/channels/$section")({
  loader: ({ params }) => {
    const s = liveSections.find((x) => x.slug === params.section);
    if (!s) throw notFound();
    return { title: s.title };
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
