import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type Movie } from "@/lib/movies";
import { getFeaturedMovies } from "@/lib/featured-movies.functions";
import { IptvBrowser } from "@/components/iptv-browser";
import { DesignElements, useSiteDesign } from "@/components/site-design-provider";

export const Route = createFileRoute("/movies")({ staticData: { sitemap: false },
  loader: () => getFeaturedMovies(),
  head: () => ({
    meta: [
      { title: "أفلام مميزة كاملة — ALMOGHANI LIVE" },
      { name: "description", content: "أحدث الأفلام الكاملة من قنوات روتانا والسبكي الرسمية، تُحدَّث تلقائيًا وتُشغَّل داخل الموقع." },
      { property: "og:title", content: "أفلام مميزة كاملة — ALMOGHANI LIVE" },
      { property: "og:description", content: "أحدث الأفلام الكاملة من القنوات الرسمية، تُحدَّث تلقائيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const design = useSiteDesign();
  const all = Route.useLoaderData();
  const navigate = useNavigate();
  const items = all.map((m: Movie) => ({
    ...m,
    name: m.title,
    thumb: `https://i.ytimg.com/vi/${m.youtubeId}/mqdefault.jpg`,
    subtitle: `${m.duration} · ${m.source}`,
    group: m.lang,
  }));
  const groups = Array.from(new Set(all.map((m: Movie) => m.lang)));
  return (
    <>
      <IptvBrowser
        title={design.labels.movies}
        items={items}
        groups={groups}
        storageKey="almoghani-movies"
        onBack={() => (window.history.length > 1 ? window.history.back() : navigate({ to: "/" }))}
        renderPlayer={(m) => (
          <div className="aspect-video w-full">
            <iframe
              key={m.youtubeId}
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${m.youtubeId}?playsinline=1&rel=0`}
              title={m.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        )}
      />
      <DesignElements />
    </>
  );
}
