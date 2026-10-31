import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery } from "@tanstack/react-query";
import { publicChannelsQuery } from "@/lib/channel-catalog.query";
import {
  ArrowRight,
  Baby,
  ChevronLeft,
  Clapperboard,
  Film,
  Home,
  ListVideo,
  Menu,
  MessageCircle,
  MoonStar,
  Newspaper,
  Play,
  Search,
  Settings,
  Signal,
  Sparkles,
  Trophy,
  Tv,
  User,
  Volume2,
  WandSparkles,
  X,
  type LucideIcon,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { type FormEvent, startTransition, useEffect, useState } from "react";
import { markActive, useInactiveChannels } from "@/lib/inactive-channels";

import tplBg from "@/assets/tpl-bg.jpg";
import tplLogo from "@/assets/tpl-logo.png";
import tplWolf from "@/assets/tpl-wolf.png";
import tplCardLive from "@/assets/tpl-card-live.jpg";
import tplCardSeries from "@/assets/tpl-card-series.jpg";
import tplCardMovies from "@/assets/tpl-card-movies.jpg";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { IptvBrowser } from "@/components/iptv-browser";
import { DesignElements, useSiteDesign } from "@/components/site-design-provider";
import { InstallAppButton } from "@/components/install-app-button";
import { LivePlayer } from "@/components/live-player";
import { Button } from "@/components/ui/button";
import { searchChannelsWithAi } from "@/lib/channel-search.functions";
import { type Channel, type ChannelCategory } from "@/lib/channels";

const sections: {
  slug: string;
  title: string;
  category: ChannelCategory;
  icon: LucideIcon;
  cols: string;
}[] = [
  { slug: "news", title: "الإخبارية", category: "إخبارية" as ChannelCategory, icon: Newspaper, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
  { slug: "sports", title: "الرياضية", category: "رياضية" as ChannelCategory, icon: Trophy, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
  { slug: "islamic", title: "الإسلامية", category: "إسلامية" as ChannelCategory, icon: MoonStar, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
  { slug: "movies", title: "أفلام كاملة", category: "أفلام كاملة" as ChannelCategory, icon: Film, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
  { slug: "series", title: "المسلسلات والأفلام", category: "مسلسلات وأفلام" as ChannelCategory, icon: Clapperboard, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
  { slug: "kids", title: "أطفال ووثائقي", category: "أطفال ووثائقي" as ChannelCategory, icon: Baby, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
  { slug: "general", title: "عامة", category: "عامة" as ChannelCategory, icon: Tv, cols: "sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6" },
];

export const liveSections = sections;

const mainCards = [
  { title: "الأفلام", img: tplCardMovies, to: "/movies" as const },
  { title: "المسلسلات", img: tplCardSeries, to: "/channels/$section" as const, params: { section: "series" } },
  { title: "البث المباشر", img: tplCardLive, to: "/live" as const },
];

export function PortalPage({ section, view = "live" }: { section?: string; view?: "home" | "live" }) {
  const design = useSiteDesign();
  const { data: channels } = useSuspenseQuery(publicChannelsQuery);
  const isHome = view === "home";
  const visibleSections = isHome ? [] : section ? sections.filter((s) => s.slug === section) : sections.filter((s) => s.slug !== "series" && s.slug !== "movies");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = channels.find((c) => c.id === selectedId) ?? channels.find((c) => c.category === visibleSections[0]?.category) ?? channels[0];
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultIds, setSearchResultIds] = useState<string[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("channel");
    const found = id && channels.find((c) => c.id === id);
    if (found) { setSelectedId(found.id); document.getElementById("player")?.scrollIntoView({ behavior: "smooth" }); }
  }, [channels]);
  const searchWithAi = useServerFn(searchChannelsWithAi);
  const navigate = useNavigate();
  function goBack() {
    if (window.history.length > 1) window.history.back();
    else navigate({ to: "/live" });
  }
  const inactiveIds = useInactiveChannels();
  const inactiveChannels = channels.filter((c) => inactiveIds.includes(c.id));

  const searchResults = searchResultIds
    ?.map((id) => channels.find((channel) => channel.id === id))
    .filter((channel): channel is Channel => Boolean(channel));

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchError("اكتب اسم قناة أو وصفًا من كلمتين على الأقل.");
      return;
    }

    setSearching(true);
    setSearchError("");
    setSearchResultIds(null);
    try {
      const result = await searchWithAi({
        data: {
          query,
        },
      });
      setSearchResultIds(result.ids);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "تعذّر إكمال البحث الذكي.");
    } finally {
      setSearching(false);
    }
  }

  // Warm up a channel before the tap lands: open the connection to its stream host
  // so the player starts faster once the channel is selected.
  function warmChannel(channel: Channel) {
    const w = window as unknown as { __warmed?: Set<string> };
    w.__warmed ??= new Set();
    if (w.__warmed.has(channel.id)) return;
    w.__warmed.add(channel.id);
    try {
      const url = channel.streamUrl ?? "https://www.youtube.com";
      const origin = new URL(url).origin;
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
      if (channel.streamUrl) {
        fetch(channel.streamUrl, { mode: "cors", referrerPolicy: "no-referrer", cache: "force-cache" }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }

  function playChannel(channel: Channel) {
    if (isHome) {
      setSearchOpen(false);
      navigate({ to: "/channels/$section", params: { section: sections.find((s) => s.category === channel.category)?.slug ?? "general" }, search: { channel: channel.id } });
      return;
    }
    // Scroll first (instant feedback), then swap the stream at lower priority so taps feel immediate.
    document.getElementById("player")?.scrollIntoView({ behavior: "auto", block: "start" });
    setSearchOpen(false);
    startTransition(() => setSelectedId(channel.id));
  }

  const previewMode = false;

  if (!isHome) {
    const groupTitles = visibleSections.map((s) => design.labels[s.slug === "movies" ? "movieChannels" : s.slug as keyof typeof design.labels] || s.title);
    const items = visibleSections.flatMap((s, idx) =>
      channels
        .filter((c) => c.category === s.category)
        .map((c) => ({ ...c, thumb: c.thumbnail, subtitle: c.description, group: groupTitles[idx] ?? s.title })),
    );
    return (
      <>
        <IptvBrowser
          title={section ? groupTitles[0] ?? "القنوات" : "البث التلفزيوني المباشر"}
          items={items}
          groups={groupTitles}
          storageKey="almoghani-live"
          initialId={selectedId}
          onBack={goBack}
          renderPlayer={(c) => (
            <div id="player" className="relative">
              <span className="absolute left-2 top-2 z-10 live-badge px-2 py-0.5 text-[10px]">
                <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-live-foreground" />LIVE
              </span>
              <LivePlayer key={c.id} channel={c} />
            </div>
          )}
        />
        <DesignElements />
      </>
    );
  }

  return (
    <div dir="rtl" className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${design.images.background || tplBg})` }}
        aria-hidden="true"
      />
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchOpen((value) => !value);
                setSearchError("");
              }}
              className="tpl-top-btn"
              aria-label="بحث"
              title="بحث"
            >
              <Search className="h-5 w-5" />
              بحث
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="tpl-top-btn"
              aria-label="الإعدادات"
              title="الإعدادات"
            >
              <Settings className="h-5 w-5" />
              الإعدادات
            </button>
            <Link to="/chat" className="tpl-top-btn" aria-label="حسابي" title="حسابي">
              <User className="h-5 w-5" />
              حسابي
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isHome && (
              <button
                type="button"
                onClick={goBack}
                className="tpl-top-btn"
                aria-label="رجوع"
                title="رجوع"
              >
                <ArrowRight className="h-5 w-5" />
                رجوع
              </button>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="tpl-top-btn"
              aria-label="القائمة"
              title="القائمة"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="mx-auto max-w-7xl animate-slide-down px-4 pb-4 sm:px-6 lg:px-8">
            <form onSubmit={handleSearch} className="ai-search-panel">
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-sky">
                <WandSparkles className="h-4 w-4" />
                بحث ذكي في القنوات المتاحة
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 focus-within:border-sky">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="مثال: قناة أخبار بتغطية مستمرة"
                    autoFocus
                    maxLength={200}
                    aria-label="اسم القناة أو وصفها"
                  />
                </label>
                <Button type="submit" size="lg" disabled={searching} className="h-12 bg-sky px-6 text-accent-foreground hover:bg-sky/90">
                  {searching ? <span className="ai-search-spinner" /> : <WandSparkles />}
                  {searching ? "جارٍ البحث" : "ابحث بالذكاء الاصطناعي"}
                </Button>
              </div>

              {searchError && <p role="alert" className="mt-3 text-sm font-bold text-signal">{searchError}</p>}

              {searchResults && (
                <div className="mt-4 border-t border-border pt-4">
                  {searchResults.length ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {searchResults.map((channel) => (
                        <Button
                          key={channel.id}
                          type="button"
                          variant="secondary"
                          onClick={() => playChannel(channel)}
                          className="h-auto min-w-0 justify-start whitespace-normal p-3 text-right"
                        >
                          <img src={channel.thumbnail} alt="" className="h-12 w-20 shrink-0 rounded-md object-contain" />
                          <span className="min-w-0">
                            <span className="block truncate font-black">{channel.name}</span>
                            <span className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{channel.description}</span>
                          </span>
                          <Play className="mr-auto text-sky" />
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground">لم نجد قناة مطابقة ضمن القنوات المتاحة حاليًا.</p>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </header>

      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12">
        <section id={isHome ? "home" : "player"} className="relative scroll-mt-20">
          <div className="relative mx-auto max-w-5xl px-4 pt-5 sm:px-6 sm:pt-8 lg:px-8">
            <h1 className="sr-only">ALMOGHANI IPTV — {isHome ? "الرئيسية" : section ? visibleSections[0]?.title : "البث المباشر"}</h1>
            <img
              data-design="logo"
              src={design.images.logo || tplLogo}
              alt="ALMOGHANI IPTV"
              width={1024}
              height={768}
              fetchPriority="high"
              className={isHome ? "mx-auto h-40 w-auto max-w-full object-contain sm:h-48" : "mx-auto h-24 w-auto max-w-full object-contain sm:h-36"}
            />
            {!isHome && selected && <div className="relative mt-3 sm:mt-5">
              <img
                data-design="wolf"
                src={design.images.wolf || tplWolf}
                alt=""
                width={768}
                height={1024}
                loading="lazy"
                className="pointer-events-none absolute -bottom-3 -right-2 z-10 w-16 sm:-right-6 sm:w-28 md:-right-14 md:w-40"
                aria-hidden="true"
              />
              <div className="tpl-frame animate-fade-up">
                <span className="absolute left-3 top-3 z-10 live-badge px-3 py-1 text-[11px] sm:left-4 sm:top-4">
                  <span className="h-2 w-2 animate-live-pulse rounded-full bg-live-foreground" />
                  LIVE
                </span>
                <LivePlayer key={selected.id} channel={selected} />
              </div>
              <div className="tpl-frame mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-sky">
                    <Signal className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{selected.name}</p>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">{selected.description}</p>
                  </div>
                </div>
                <div className="hidden items-center gap-2 text-xs font-bold text-muted-foreground sm:flex">
                  <Volume2 className="h-4 w-4 text-sky" />
                  يعمل داخل الموقع
                </div>
              </div>
            </div>}
          </div>
        </section>

        {isHome && <section className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8" aria-label="الأقسام الرئيسية">
          <div data-design="cards" className="grid grid-cols-3 gap-3 sm:gap-5">
            {mainCards.map((card) => (
              <Link
                key={card.title}
                to={card.to}
                {...("params" in card ? { params: card.params } : {})}
                className="tpl-card"
              >
                <span className="block aspect-[3/4] overflow-hidden">
                  <img
                    src={design.images[card.to === "/movies" ? "movies" : card.to === "/live" ? "live" : "series"] || card.img}
                    alt={card.title}
                    width={768}
                    height={1024}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="grid min-h-20 place-items-center content-center gap-1.5 px-1 py-3">
                  <span className="gold-title text-center font-display text-xs font-black leading-5 sm:text-xl">{design.labels[card.to === "/movies" ? "movies" : card.to === "/live" ? "live" : "series"]}</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-accent text-accent">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>}

        {!isHome && <div id="channels" className="mx-auto max-w-7xl space-y-8 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
          {inactiveChannels.length > 0 && (
            <details className="rounded-xl border border-border bg-surface">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-black">
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                قنوات غير نشطة ({inactiveChannels.length})
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {inactiveChannels.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{c.category}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        markActive(c.id);
                        playChannel(c);
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      تحديث الرابط
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible" aria-label="الأقسام">
            {visibleSections.map((s) => {
              const count = channels.filter((c) => c.category === s.category).length;
              return (
                <a
                  key={s.slug}
                  href={`#section-${s.slug}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-sky hover:text-sky"
                >
                  <s.icon className="h-4 w-4 shrink-0 text-sky" />
                  <span className="whitespace-nowrap">{s.title}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black text-muted-foreground">{count}</span>
                </a>
              );
            })}
          </div>
          {visibleSections.map((section, index) => {
            const sectionChannels = channels.filter((channel) => channel.category === section.category);
            const previewChannels = previewMode ? sectionChannels.slice(0, 8) : sectionChannels;
            const hiddenCount = sectionChannels.length - previewChannels.length;
            return (
              <section id={`section-${section.slug}`} key={section.title} className="scroll-mt-28 border-t border-border/60 pt-9 first:border-t-0 first:pt-0 sm:pt-12">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky/40 bg-secondary text-sky sm:h-12 sm:w-12">
                      <section.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-black sm:text-2xl">{design.labels[section.slug === "movies" ? "movieChannels" : section.slug as keyof typeof design.labels] || section.title}</h2>
                      <p className="truncate text-xs font-bold text-muted-foreground sm:text-sm">
                        {sectionChannels.length ? `${sectionChannels.length} قناة مباشرة` : "قريبًا"}
                      </p>
                    </div>
                  </div>
                  {previewMode && sectionChannels.length > 8 && (
                    <Link
                      to="/channels/$section"
                      params={{ section: section.slug }}
                      className="shrink-0 rounded-full border border-primary/70 px-4 py-2 text-xs font-black text-sky transition-colors hover:bg-primary/10"
                    >
                      عرض الكل
                    </Link>
                  )}
                  {section.slug === "movies" && (
                    <Link
                      to="/movies"
                      className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground"
                    >
                      أفلام مميزة
                    </Link>
                  )}
                </div>

                {sectionChannels.length ? (
                  <>
                    <div data-design="channel-grid" className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${section.cols}`}>
                      {previewChannels.map((channel, i) => (
                      <button
                        key={channel.id}
                        type="button"
                        onPointerEnter={() => warmChannel(channel)}
                        onTouchStart={() => warmChannel(channel)}
                        onFocus={() => warmChannel(channel)}
                        onClick={() => {
                          playChannel(channel);
                        }}
                        style={{ contentVisibility: "auto", containIntrinsicSize: "auto 220px" }}
                        className={`channel-card ${selected?.id === channel.id ? "channel-card-active" : ""}`}
                      >
                        <span className="relative block aspect-video overflow-hidden bg-surface-deep">
                          <span className="absolute inset-0 animate-pulse bg-muted/40" aria-hidden />
                          <img
                            loading={index === 0 && i < 4 ? "eager" : "lazy"}
                            fetchPriority={index === 0 && i < 4 ? "high" : "low"}
                            decoding="async"
                            width={320}
                            height={180}
                            onLoad={(e) => (e.currentTarget.previousElementSibling as HTMLElement | null)?.remove()}
                            className={`relative h-full w-full transition-transform duration-500 ${channel.streamUrl ? "object-contain p-4" : "object-cover group-hover:scale-105"}`}
                            src={channel.thumbnail}
                            alt={`صورة ${channel.name}`}
                          />
                          <span className="absolute inset-0 bg-player-overlay" />
                          <span className="absolute left-2 top-2 live-badge px-2 py-0.5 text-[9px] sm:left-3 sm:top-3 sm:text-[10px]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live-foreground" />
                            {selected?.id === channel.id ? "يُعرض الآن" : "LIVE"}
                          </span>
                          <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-live">
                              <Play className="h-5 w-5 fill-current" />
                            </span>
                          </span>
                        </span>
                        <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2 text-right sm:gap-3 sm:p-4">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold sm:text-base">{channel.name}</span>
                            <span className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{channel.description}</span>
                          </span>
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-sky text-foreground sm:h-9 sm:w-9"><Play className="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" /></span>
                        </span>
                      </button>
                     ))}
                    </div>
                    {hiddenCount > 0 && (
                      <Link
                        to="/channels/$section"
                        params={{ section: section.slug }}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-black text-sky transition-colors hover:border-sky hover:bg-primary/5"
                      >
                        <ListVideo className="h-4 w-4" />
                        عرض كل قنوات {section.title} ({sectionChannels.length})
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="empty-channel-row">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <ListVideo className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold">لا توجد قنوات مضافة بعد</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">ستظهر القنوات هنا عند تزويدي بالاسم ورابط البث.</p>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>}
      </main>

      {menuOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-label="القائمة">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="إغلاق القائمة"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-e border-border bg-surface p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-2">
              <img src={tplLogo} alt="ALMOGHANI IPTV" width={1024} height={768} className="h-14 w-auto" />
              <button type="button" onClick={() => setMenuOpen(false)} className="tpl-top-btn" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="grid gap-1 text-sm font-bold" aria-label="قائمة التنقل" onClick={() => setMenuOpen(false)}>
              <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary">
                <Home className="h-4 w-4 text-sky" /> الرئيسية
              </Link>
              <Link to="/live" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary">
                <Tv className="h-4 w-4 text-sky" /> البث المباشر
              </Link>
              <Link to="/movies" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary">
                <Film className="h-4 w-4 text-sky" /> الأفلام
              </Link>
              <Link to="/quran" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary">
                <Sparkles className="h-4 w-4 text-sky" /> القرآن الكريم
              </Link>
              <Link to="/chat" className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary">
                <MessageCircle className="h-4 w-4 text-sky" /> المحادثة
              </Link>
              <p className="mt-4 border-t border-border px-3 pt-4 text-xs font-black text-muted-foreground">الأقسام</p>
              {sections.map((s) => (
                <Link
                  key={s.slug}
                  to="/channels/$section"
                  params={{ section: s.slug }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
                >
                  <s.icon className="h-4 w-4 text-sky" /> {s.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-label="الإعدادات">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
            aria-label="إغلاق الإعدادات"
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-black">الإعدادات</h2>
              <button type="button" onClick={() => setSettingsOpen(false)} className="tpl-top-btn" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3">
              <InstallAppButton />
              <p className="text-xs text-muted-foreground">ثبّت التطبيق على جوالك للوصول السريع.</p>
            </div>
          </div>
        </div>
      )}

      <Link
        to="/chat"
        className="fixed bottom-6 left-4 z-40 hidden items-center gap-2 rounded-full border border-primary/70 bg-gradient-to-l from-primary to-primary/80 px-4 py-3 font-display text-sm font-black text-primary-foreground shadow-live transition-transform hover:-translate-y-0.5 md:flex"
      >
        <MessageCircle className="h-5 w-5" />ALMOGHANI AI
      </Link>
      <DesignElements />
      <AppBottomNav />
    </div>
  );
}
