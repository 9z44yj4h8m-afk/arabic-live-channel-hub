import { ArrowRight, Clock, Heart, Home, LayoutGrid, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";

export type BrowserItem = { id: string; name: string; thumb?: string; subtitle?: string; group: string };

/**
 * Landscape IPTV-style browser: categories | numbered list | player.
 * In portrait it stacks (player first) so phones held upright still work.
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
  const [catQuery, setCatQuery] = useState("");
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

  const cats = useMemo(
    () => [
      { key: "__all", label: "الكل", count: items.length },
      { key: "__recent", label: "شوهد مؤخراً", count: recent.filter((id) => items.some((i) => i.id === id)).length },
      { key: "__favs", label: "المفضلة", count: favs.filter((id) => items.some((i) => i.id === id)).length },
      ...groups.map((g) => ({ key: g, label: g, count: items.filter((i) => i.group === g).length })),
    ],
    [items, groups, favs, recent],
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

  const shownCats = cats.filter((c) => !catQuery.trim() || c.label.includes(catQuery.trim()));

  return (
    <div dir="rtl" className="iptv-shell flex min-h-dvh flex-col text-foreground landscape:h-dvh landscape:overflow-hidden">
      <header className="iptv-bar grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} className="iptv-icon" aria-label="رجوع">
            <ArrowRight className="h-5 w-5" />
          </button>
          <h1 className="truncate font-display text-sm font-black sm:text-lg">{title}</h1>
        </div>
        <label className="iptv-search mx-auto w-full max-w-md">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث" aria-label="بحث في القائمة" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        <nav className="flex shrink-0 items-center gap-1.5" aria-label="التنقل">
          <Link to="/" className="iptv-icon" aria-label="الرئيسية"><Home className="h-4 w-4" /></Link>
          <Link to="/live" className="iptv-icon" aria-label="البث المباشر"><LayoutGrid className="h-4 w-4" /></Link>
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 gap-2 p-2 landscape:grid-cols-[minmax(150px,24%)_minmax(0,1fr)_minmax(0,40%)] portrait:grid-cols-1 md:grid-cols-[minmax(170px,22%)_minmax(0,1fr)_minmax(0,42%)]">
        {/* Player column (last in landscape = leftmost in RTL, first on portrait) */}
        <section className="iptv-panel flex min-h-0 flex-col gap-2 p-2 portrait:order-first landscape:order-3 md:order-3" aria-label="المشغل">
          <div className="overflow-hidden rounded-lg bg-surface-deep">{selected ? renderPlayer(selected) : null}</div>
          {selected && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-1">
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{selected.name}</p>
                {selected.subtitle && <p className="line-clamp-2 text-xs text-muted-foreground">{selected.subtitle}</p>}
              </div>
              <button type="button" onClick={() => toggleFav(selected.id)} className="iptv-icon" aria-label={favs.includes(selected.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"} aria-pressed={favs.includes(selected.id)}>
                <Heart className={`h-4 w-4 ${favs.includes(selected.id) ? "fill-current text-live" : ""}`} />
              </button>
            </div>
          )}
          <div className="mt-auto hidden items-center gap-4 border-t border-border/60 px-1 pt-2 text-[11px] font-bold text-muted-foreground landscape:flex md:flex">
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />المفضلة <span className="h-1 w-5 rounded bg-live" /></span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />شوهد مؤخراً <span className="h-1 w-5 rounded bg-sky" /></span>
          </div>
        </section>

        {/* Categories */}
        <aside className="iptv-panel flex min-h-0 flex-col gap-1.5 p-2 landscape:order-1 md:order-1" aria-label="التصنيفات">
          <input value={catQuery} onChange={(e) => setCatQuery(e.target.value)} placeholder="بحث في التصنيفات" aria-label="بحث في التصنيفات" className="iptv-row w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
          <div className="flex min-h-0 gap-1.5 overflow-auto portrait:flex-row landscape:flex-col md:flex-col [scrollbar-width:thin]">
            {shownCats.map((c) => (
              <button key={c.key} type="button" onClick={() => setGroup(c.key)} className={`iptv-row shrink-0 justify-between text-xs ${group === c.key ? "iptv-row-active" : ""}`}>
                <span className="truncate">{c.label}</span>
                <span className="shrink-0 tabular-nums opacity-80">{c.count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Numbered list */}
        <section className="iptv-panel min-h-0 overflow-y-auto p-2 landscape:order-2 md:order-2 [scrollbar-width:thin]" aria-label="القائمة">
          {list.length ? (
            <ol className="grid gap-1.5">
              {list.map((item, i) => (
                <li key={item.id} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 52px" }}>
                  <button type="button" onClick={() => select(item)} className={`iptv-row w-full ${selected?.id === item.id ? "iptv-row-active" : ""}`}>
                    <span className="w-7 shrink-0 text-center text-base font-black tabular-nums">{i + 1}</span>
                    {item.thumb ? (
                      <img src={item.thumb} alt="" loading="lazy" decoding="async" className="h-8 w-12 shrink-0 rounded bg-surface-deep object-contain" />
                    ) : (
                      <span className="h-8 w-12 shrink-0 rounded bg-surface-deep" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-right text-sm font-bold">{item.name}</span>
                    {favs.includes(item.id) && <Heart className="h-3.5 w-3.5 shrink-0 fill-current text-live" />}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="p-4 text-center text-sm font-bold text-muted-foreground">لا يوجد محتوى هنا بعد.</p>
          )}
        </section>
      </div>
    </div>
  );
}
