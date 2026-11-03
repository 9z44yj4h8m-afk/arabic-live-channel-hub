import { ArrowRight, Clock, Globe, Heart, Home, LayoutGrid, Play, Search, Tv } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { channelDisplayName } from "@/lib/channel-names";
import { type ReactNode, useEffect, useMemo, useState } from "react";

export type BrowserItem = { id: string; name: string; thumb?: string; subtitle?: string; group: string };

/**
 * Landscape IPTV browser matching the "Broadcast Atlas" style:
 * a list panel (title, filter pills, logo rows) beside a large player
 * with a channel overlay. In portrait it stacks (player first).
 */
export function IptvBrowser<T extends BrowserItem>({
  title,
  items,
  groups,
  storageKey,
  initialId,
  onBack,
  renderPlayer,
}: {
  title: string;
  items: T[];
  groups: string[];
  storageKey: string;
  initialId?: string | undefined;
  onBack: () => void;
  renderPlayer: (item: T) => ReactNode;
}) {
  const [group, setGroup] = useState("__all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(initialId);
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setFavs(JSON.parse(localStorage.getItem(`${storageKey}:favs`) || "[]"));
      setRecent(JSON.parse(localStorage.getItem(`${storageKey}:recent`) || "[]"));
    } catch {
      /* ignore */
    }
  }, [storageKey]);
  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  function persist(key: string, value: string[]) {
    try {
      localStorage.setItem(`${storageKey}:${key}`, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }

  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  function select(item: T) {
    setSelectedId(item.id);
    const next = [item.id, ...recent.filter((id) => id !== item.id)].slice(0, 30);
    setRecent(next);
    persist("recent", next);
    if (window.matchMedia("(orientation: portrait)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFav(id: string) {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [id, ...favs];
    setFavs(next);
    persist("favs", next);
  }

  const pills = useMemo(
    () => [
      { key: "__all", label: "الكل", icon: Globe, count: items.length },
      { key: "__favs", label: "المفضلة", icon: Heart, count: favs.filter((id) => items.some((i) => i.id === id)).length },
      { key: "__recent", label: "شوهد مؤخراً", icon: Clock, count: recent.filter((id) => items.some((i) => i.id === id)).length },
    ],
    [items, favs, recent],
  );

  const list = useMemo(() => {
    let base: T[];
    if (group === "__all") base = items;
    else if (group === "__recent") base = recent.map((id) => items.find((i) => i.id === id)).filter((i): i is T => Boolean(i));
    else if (group === "__favs") base = favs.map((id) => items.find((i) => i.id === id)).filter((i): i is T => Boolean(i));
    else base = items.filter((i) => i.group === group);
    const q = query.trim();
    return q ? base.filter((i) => i.name.includes(q)) : base;
  }, [items, group, favs, recent, query]);

  return (
    <div dir="rtl" className="iptv-shell flex min-h-dvh flex-col text-foreground landscape:h-dvh landscape:overflow-hidden">
      {/* Slim navigation bar */}
      <header className="iptv-bar grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5">
        <button type="button" onClick={onBack} className="iptv-icon" aria-label="رجوع">
          <ArrowRight className="h-5 w-5" />
        </button>
        <label className="iptv-search mx-auto w-full max-w-md">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث عن قناة" aria-label="بحث في القائمة" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <nav className="flex shrink-0 items-center gap-1.5" aria-label="التنقل">
          <Link to="/subscription" className="iptv-icon" aria-label="اشتراكي" title="اشتراكي"><Tv className="h-4 w-4" /></Link>
          <Link to="/" className="iptv-icon" aria-label="الرئيسية"><Home className="h-4 w-4" /></Link>
          <Link to="/live" className="iptv-icon" aria-label="البث المباشر"><LayoutGrid className="h-4 w-4" /></Link>
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 gap-2 p-2 portrait:grid-cols-1 landscape:grid-cols-[minmax(280px,38%)_minmax(0,1fr)] md:landscape:grid-cols-[minmax(320px,40%)_minmax(0,1fr)]">
        {/* Player pane (second in RTL = left side, first on portrait) */}
        <section className="iptv-panel relative flex min-h-0 flex-col overflow-hidden portrait:order-first landscape:order-2" aria-label="المشغل">
          <div className="grid min-h-0 flex-1 place-items-center bg-surface-deep">
            {selected ? <div className="w-full">{renderPlayer(selected)}</div> : null}
          </div>
          {selected && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-background/95 via-background/60 to-transparent p-3 pt-10">
              <div className="flex min-w-0 items-center gap-3">
                {selected.thumb ? (
                  <img src={selected.thumb} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-lg bg-primary-foreground object-contain p-1" />
                ) : (
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-secondary"><Tv className="h-6 w-6 text-muted-foreground" /></span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">{channelDisplayName(selected.name)}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[selected.group, selected.subtitle].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => toggleFav(selected.id)} className="iptv-icon pointer-events-auto" aria-label={favs.includes(selected.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"} aria-pressed={favs.includes(selected.id)}>
                <Heart className={`h-4 w-4 ${favs.includes(selected.id) ? "fill-current text-live" : ""}`} />
              </button>
            </div>
          )}
        </section>

        {/* List panel */}
        <aside className="iptv-panel flex min-h-0 flex-col gap-2 p-3 landscape:order-1" aria-label="قائمة القنوات">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-accent/50 bg-accent/15">
              <Tv className="h-5 w-5 text-accent" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-black leading-tight">{title}</h1>
              <p className="truncate text-xs font-bold text-muted-foreground">ALMOGHANI IPTV</p>
            </div>
          </div>

          <p className="text-[11px] font-bold leading-relaxed text-muted-foreground">
            اختر قناة من القائمة للتشغيل · ★ للمفضلة · ابحث بالاسم من الأعلى
          </p>

          {/* Filter pills */}
          <div className="grid grid-cols-3 gap-1.5">
            {pills.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setGroup(p.key)}
                aria-pressed={group === p.key}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-xs font-black transition-colors ${
                  group === p.key
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-secondary/70 text-foreground"
                }`}
              >
                <p.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Group chips */}
          {groups.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]" aria-label="التصنيفات">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  aria-pressed={group === g}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black transition-colors ${
                    group === g ? "border-accent bg-accent/15 text-accent" : "border-border bg-secondary/70"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {/* Channel rows */}
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]" aria-label="القنوات">
            {list.length ? (
              <ol className="grid gap-1.5 pe-0.5">
                {list.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <li key={item.id} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 60px" }}>
                      <button
                        type="button"
                        onClick={() => select(item)}
                        className={`flex w-full items-center gap-2.5 rounded-xl border p-1.5 text-right transition-colors ${
                          active ? "border-accent bg-accent/15" : "border-transparent hover:border-border hover:bg-secondary/60"
                        }`}
                      >
                        {item.thumb ? (
                          <img src={item.thumb} alt="" loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-lg bg-primary-foreground object-contain p-0.5" />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary"><Tv className="h-5 w-5 text-muted-foreground" /></span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">{channelDisplayName(item.name)}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[item.group, item.subtitle].filter(Boolean).join(" • ")}
                          </span>
                        </span>
                        {favs.includes(item.id) && <Heart className="h-3.5 w-3.5 shrink-0 fill-current text-live" />}
                        {active && <Play className="h-4 w-4 shrink-0 fill-current text-accent" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="p-4 text-center text-sm font-bold text-muted-foreground">لا يوجد محتوى هنا بعد.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
