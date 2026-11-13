import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Tv, Film, Clapperboard, Search, Settings, X, Radio, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBottomNav } from "@/components/app-bottom-nav";
import { InstallAppButton } from "@/components/install-app-button";
import { DesignElements, useSiteDesign } from "@/components/site-design-provider";
import logo from "@/assets/tpl-logo.png";
import live from "@/assets/tpl-card-live.jpg";
import movies from "@/assets/tpl-card-movies.jpg";
import series from "@/assets/tpl-card-series.jpg";

export function GoldHome() {
  const design = useSiteDesign();
  const [settings, setSettings] = useState(false);
  return <div dir="rtl" className="gold-layout gold-home">
    <AppBottomNav rail />
    <main className="gold-home-content">
      <header className="gold-heading"><h1>ALMOGHANI LIVE</h1><p>Gold Edition</p></header>
      <div className="gold-home-choices" data-design="cards">
        <Button asChild variant="outline" className="gold-control gold-green gold-smart"><Link to="/subscription"><Tv /><span>سمارت — البث المباشر</span><ChevronLeft /></Link></Button>
        <Button asChild variant="outline" className="gold-control gold-choice"><Link to="/live"><img src={design.images.live || live} alt="" /><span><Radio />{design.labels.live}</span><ChevronLeft /></Link></Button>
        <Button asChild variant="outline" className="gold-control gold-choice"><Link to="/movies"><img src={design.images.movies || movies} alt="" /><span><Film />{design.labels.movies}</span><ChevronLeft /></Link></Button>
        <Button asChild variant="outline" className="gold-control gold-choice"><Link to="/channels/$section" params={{ section: "series" }}><img src={design.images.series || series} alt="" /><span><Clapperboard />{design.labels.series}</span><ChevronLeft /></Link></Button>
      </div>
    </main>
    <section className="gold-home-brand gold-frame" aria-label="المغني IPTV">
      <div className="gold-brand-stage"><img data-design="logo" src={design.images.logo || logo} alt="ALMOGHANI IPTV" width={1024} height={768} fetchPriority="high" /></div>
      <p className="gold-brand-caption">ALMOGHANI LIVE <span>• Channels • Movies • Series</span></p>
      <Button asChild variant="outline" className="gold-control gold-green w-full"><Link to="/live"><Radio />البث المباشر<ChevronLeft /></Link></Button>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" className="gold-control"><Link to="/live"><Search />البحث</Link></Button>
        <Button variant="outline" className="gold-control" onClick={() => setSettings(true)}><Settings />الإعدادات</Button>
      </div>
    </section>
    {settings && <div className="fixed inset-0 z-[70] grid place-items-center bg-background/90 p-4" role="dialog" aria-modal="true" aria-label="الإعدادات"><div className="gold-frame w-full max-w-sm p-5"><div className="mb-5 flex items-center justify-between"><h2>الإعدادات</h2><Button size="icon" variant="outline" className="gold-control" onClick={() => setSettings(false)} aria-label="إغلاق"><X /></Button></div><InstallAppButton /></div></div>}
    <DesignElements />
  </div>;
}