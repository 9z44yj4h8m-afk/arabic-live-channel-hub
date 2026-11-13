import { ChevronLeft, ChevronRight, Star, Home, Search, Radio, Settings, X, Play, Tv } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { channelDisplayName } from "@/lib/channel-names";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { useSiteDesign } from "@/components/site-design-provider";
import logo from "@/assets/tpl-logo.png";

export type BrowserItem = { id: string; name: string; thumb?: string; subtitle?: string; group: string };

export function IptvBrowser<T extends BrowserItem>({ title, items, groups, storageKey, initialId, onBack, renderPlayer }: {
  title: string; items: T[]; groups: string[]; storageKey: string; initialId?: string | undefined; onBack: () => void; renderPlayer: (item: T) => ReactNode;
}) {
  const design = useSiteDesign();
  const [group, setGroup] = useState("__all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(initialId);
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [visible, setVisible] = useState(50);
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem(`${storageKey}:favs`) || "[]");
      const r = JSON.parse(localStorage.getItem(`${storageKey}:recent`) || "[]");
      if (Array.isArray(f)) setFavs(f.filter(v => typeof v === "string"));
      if (Array.isArray(r)) setRecent(r.filter(v => typeof v === "string"));
    } catch { /* Storage may be unavailable. */ }
  }, [storageKey]);
  useEffect(() => { if (initialId) setSelectedId(initialId); }, [initialId]);
  const index = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const selected = (selectedId ? index.get(selectedId) : undefined) ?? items[0];
  function persist(key: string, value: string[]) { try { localStorage.setItem(`${storageKey}:${key}`, JSON.stringify(value)); } catch { /* optional */ } }
  function select(item: T) {
    setSelectedId(item.id);
    const next = [item.id, ...recent.filter(id => id !== item.id)].slice(0, 30);
    setRecent(next); persist("recent", next);
  }
  function toggleFav(id: string) { const next = favs.includes(id) ? favs.filter(f => f !== id) : [id, ...favs]; setFavs(next); persist("favs", next); }
  const list = useMemo(() => {
    const ids = group === "__favs" ? favs : group === "__recent" ? recent : undefined;
    const base = ids ? ids.map(id => index.get(id)).filter((i): i is T => Boolean(i)) : group === "__all" ? items : items.filter(i => i.group === group);
    const q = query.trim().toLocaleLowerCase();
    return q ? base.filter(i => channelDisplayName(i.name).toLocaleLowerCase().includes(q) || i.name.toLocaleLowerCase().includes(q)) : base;
  }, [items, index, group, favs, recent, query]);
  function changeGroup(value: string) { setGroup(value); setVisible(50); }
  function step(direction: number) { const pos = list.findIndex(i => i.id === selected?.id); const next = list[(pos + direction + list.length) % list.length]; if (next) select(next); }
  return <div dir="rtl" className="gold-layout gold-browser">
    <AppBottomNav rail />
    <aside className="gold-channel-pane" aria-label="قائمة القنوات">
      <header className="gold-heading"><h1>ALMOGHANI LIVE</h1><p>Gold Edition</p><h2>{title}</h2></header>
      <div className="gold-list-toolbar">
        <Button variant="outline" className="gold-control" onClick={() => step(-1)} disabled={!list.length}><ChevronRight />السابقة</Button>
        <Button variant="outline" className="gold-control" onClick={() => step(1)} disabled={!list.length}>التالية<ChevronLeft /></Button>
        <Button variant="outline" className={`gold-control ${group === "__all" ? "gold-green" : ""}`} onClick={() => changeGroup("__all")}>القنوات</Button>
      </div>
      <select aria-label="التصنيفات" className="gold-group-select" value={group} onChange={e => changeGroup(e.target.value)}>
        <option value="__all">كل القنوات ({items.length})</option><option value="__favs">المفضلة</option><option value="__recent">شوهد مؤخراً</option>
        {groups.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      {searchOpen && <label className="gold-search"><Search /><input aria-label="بحث في القائمة" placeholder="بحث عن قناة" value={query} onChange={e => { setQuery(e.target.value); setVisible(50); }} autoFocus /></label>}
      <div className="gold-channel-scroll" aria-label="القنوات" onScroll={e => { const el = e.currentTarget; if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) setVisible(n => Math.min(n + 50, list.length)); }}>
        <ol className="grid gap-2">
          {list.slice(0, visible).map((item, i) => <li key={item.id}><Button variant="outline" onClick={() => select(item)} className={`gold-control gold-channel-row ${selected?.id === item.id ? "gold-green" : ""}`} aria-pressed={selected?.id === item.id}>
            <span className="gold-channel-logo">{item.thumb ? <img src={item.thumb} alt="" loading="lazy" decoding="async" /> : <Tv />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate font-black">{channelDisplayName(item.name)}</span><span className="block truncate text-xs text-muted-foreground">{item.group}</span></span>
            <span className="gold-row-number">{i + 1}</span>
          </Button></li>)}
        </ol>
        {!list.length && <p className="py-8 text-center text-muted-foreground">لا توجد قنوات مطابقة</p>}
        {visible < list.length && <Button variant="outline" className="gold-control mt-2 w-full" onClick={() => setVisible(n => n + 50)}>عرض المزيد</Button>}
      </div>
    </aside>
    <section className="gold-viewer gold-frame" aria-label="المشغل">
      <div className="gold-player-stage"><img className="gold-player-logo" src={design.images.logo || logo} alt="ALMOGHANI IPTV" />{selected && <div className="gold-player-media">{renderPlayer(selected)}</div>}</div>
      <div className="gold-now"><span className="live-badge">LIVE</span><p className="min-w-0 truncate">{selected ? channelDisplayName(selected.name) : title}</p><span className="text-accent">{selected ? items.indexOf(selected) + 1 : 0}</span></div>
      <Button variant="outline" className="gold-control gold-green w-full" onClick={() => { changeGroup("__all"); setSearchOpen(false); }}><Play />قائمة القنوات</Button>
      <div className="grid grid-cols-2 gap-2"><Button asChild variant="outline" className="gold-control"><Link to="/"><Home />الرئيسية</Link></Button><Button variant="outline" className="gold-control" disabled={!selected} onClick={() => { if (selected) toggleFav(selected.id); }} aria-pressed={Boolean(selected && favs.includes(selected.id))}><Star className={selected && favs.includes(selected.id) ? "fill-current text-accent" : "text-accent"} />المفضلة</Button></div>
      <div className="gold-player-tools"><Button variant="outline" className="gold-control" onClick={onBack}><Radio />البث المباشر</Button><Button variant="outline" className="gold-control" onClick={() => setSearchOpen(v => !v)} aria-pressed={searchOpen}><Search />البحث</Button><Button asChild variant="outline" className="gold-control"><Link to="/subscription"><Tv />سمارت</Link></Button><Button variant="outline" className="gold-control" onClick={() => setSettingsOpen(true)}><Settings />الإعدادات</Button></div>
    </section>
    {settingsOpen && <div className="fixed inset-0 z-[70] grid place-items-center bg-background/90 p-4" role="dialog" aria-modal="true" aria-label="الإعدادات"><div className="gold-frame w-full max-w-sm p-5"><div className="flex items-center justify-between"><h2>الإعدادات</h2><Button variant="outline" size="icon" className="gold-control" onClick={() => setSettingsOpen(false)} aria-label="إغلاق"><X /></Button></div><label className="mt-5 block text-sm">قائمة العرض<select className="gold-group-select mt-2" value={group} onChange={e => changeGroup(e.target.value)}><option value="__all">كل القنوات</option><option value="__favs">المفضلة</option><option value="__recent">شوهد مؤخراً</option></select></label></div></div>}
  </div>;
}
