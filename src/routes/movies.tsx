import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Play, X } from "lucide-react";
import { type Movie } from "@/lib/movies";
import { getFeaturedMovies } from "@/lib/featured-movies.functions";

export const Route = createFileRoute("/movies")({
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

function Cover({ id, alt, eager }: { id: string; alt: string; eager?: boolean }) {
  return (
    <img
      src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.includes("hqdefault")) img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      }}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      width={1280}
      height={720}
      className="h-full w-full object-cover"
    />
  );
}

function MoviesPage() {
  const all = Route.useLoaderData();
  const [filter, setFilter] = useState<"الكل" | Movie["lang"]>("الكل");
  const [playing, setPlaying] = useState<Movie | null>(null);
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const list = filter === "الكل" ? all : all.filter((m) => m.lang === filter);

  function go(i: number) {
    const el = track.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function onScroll() {
    const t = track.current;
    if (!t) return;
    const w = t.clientWidth;
    setIndex(Math.min(list.length - 1, Math.round(Math.abs(t.scrollLeft) / (w * 0.86))));
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link to="/channels/$section" params={{ section: "movies" }} className="icon-button shrink-0" aria-label="رجوع">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-black text-primary sm:text-xl">أفلام مميزة كاملة</h1>
          <span className="ms-auto text-xs text-muted-foreground">{list.length} فيلم</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl pt-4">
        <div className="flex gap-2 px-4">
          {(["الكل", "عربي", "عالمي"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setIndex(0);
                track.current?.scrollTo({ left: 0 });
              }}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* One movie per screen: swipe to browse */}
        <div
          ref={track}
          onScroll={onScroll}
          className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-[7%] pb-2 [scrollbar-width:none]"
        >
          {list.map((m, i) => (
            <article key={m.id} className="w-[86%] shrink-0 snap-center sm:w-[60%] lg:w-[40%]">
              <button
                type="button"
                onClick={() => setPlaying(m)}
                className="channel-card block w-full overflow-hidden text-right"
              >
                <span className="relative block aspect-[4/5] overflow-hidden bg-surface-deep sm:aspect-video">
                  <Cover id={m.youtubeId} alt={m.title} eager={i < 2} />
                  <span className="absolute inset-0 bg-player-overlay" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-live">
                      <Play className="h-7 w-7 fill-current" />
                    </span>
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block text-xl font-black leading-tight">{m.title}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                      <Clock className="h-3.5 w-3.5" /> {m.duration} · {m.lang}
                    </span>
                  </span>
                </span>
                <span className="block p-4">
                  <span className="line-clamp-2 block text-sm text-muted-foreground">{m.description}</span>
                  <span className="mt-2 block text-xs text-primary">{m.source}</span>
                </span>
              </button>
            </article>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4">
          <button type="button" className="icon-button" aria-label="السابق" disabled={index === 0} onClick={() => go(index - 1)}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-muted-foreground">
            {Math.min(index + 1, list.length)} / {list.length}
          </span>
          <button type="button" className="icon-button" aria-label="التالي" disabled={index >= list.length - 1} onClick={() => go(index + 1)}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </main>

      {playing && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background">
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <button type="button" className="icon-button" aria-label="إغلاق" onClick={() => setPlaying(null)}>
              <X className="h-5 w-5" />
            </button>
            <h2 className="truncate font-bold">{playing.title}</h2>
          </div>
          <div className="aspect-video w-full bg-surface-deep">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${playing.youtubeId}?autoplay=1&playsinline=1&rel=0`}
              title={playing.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">{playing.description}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {playing.duration} · {playing.source}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
