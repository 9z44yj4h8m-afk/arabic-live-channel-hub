import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Eye, FolderOpen, Home, LogOut, Palette, Play, Radio, RotateCcw, Save, ShieldCheck, Tv, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AdminArea = "home" | "channels" | "categories" | "movies" | "design" | "subscription";
export const adminAreas = [
  { id: "home", label: "الرئيسية", icon: Home, tone: "gold" },
  { id: "channels", label: "إدارة القنوات", icon: Tv, tone: "cyan" },
  { id: "categories", label: "الأقسام والتصنيفات", icon: FolderOpen, tone: "green" },
  { id: "movies", label: "قنوات الأفلام والمسلسلات", icon: Film, tone: "violet" },
  { id: "design", label: "التصميم والمظهر", icon: Palette, tone: "gold" },
  { id: "subscription", label: "اشتراك سمارت", icon: Radio, tone: "cyan" },
] as const;

export function AdminDashboardShell({ children, area, onNavigate, onSignOut, onSave, onReset, dirty = false, saving = false }: {
  children: ReactNode; area: AdminArea; onNavigate?: (area: AdminArea) => void; onSignOut?: () => void;
  onSave?: () => void; onReset?: () => void; dirty?: boolean; saving?: boolean;
}) {
  return <div className="admin-dashboard" dir="rtl">
    <header className="admin-header">
      <div className="admin-brand"><Play aria-hidden="true" /><div><strong dir="ltr">ALMOGHANI <span>LIVE</span></strong><p>لوحة التحكم الرئيسية</p></div></div>
      <div className="admin-header-actions">
        {onSave && <><Button className="admin-control" data-tone="green" onClick={onSave} disabled={!dirty || saving}><Save />{saving ? "جارٍ الحفظ" : "حفظ التغييرات"}</Button><Button className="admin-control" data-tone="red" onClick={onReset} disabled={!dirty || saving}><RotateCcw />إلغاء التعديلات</Button></>}
        <Button asChild className="admin-control" data-tone="violet"><Link to="/" target="_blank" rel="noopener noreferrer"><Eye />معاينة الموقع</Link></Button>
      </div>
      <div className="admin-identity"><ShieldCheck /><div><strong>إدارة المغني</strong><p>{onSignOut ? "جلسة إدارة محمية" : "دخول الإدارة"}</p></div>{onSignOut && <Button variant="ghost" size="icon" onClick={onSignOut} title="تسجيل الخروج" aria-label="تسجيل الخروج"><LogOut /></Button>}</div>
    </header>
    <div className="admin-layout">
      {onNavigate && <aside className="admin-sidebar"><nav aria-label="أقسام لوحة التحكم">{adminAreas.map(({ id, label, icon: Icon, tone }) => <Button key={id} variant="ghost" className="admin-nav-item" data-tone={tone} aria-current={area === id ? "page" : undefined} onClick={() => onNavigate(id)}><Icon /><span>{label}</span></Button>)}</nav><div className="admin-sidebar-bottom"><ShieldCheck /><span>لوحة خاصة بالمدير</span></div></aside>}
      <main className="admin-main">{children}</main>
    </div>
    <footer className="admin-footer"><span dir="ltr">ALMOGHANI LIVE</span><span><Crown />جميع الحقوق محفوظة · المغني</span></footer>
  </div>;
}

export function AdminOverview({ entries, sections, onNavigate }: { entries: { deleted: boolean; hidden?: boolean }[]; sections: number; onNavigate: (area: AdminArea) => void }) {
  const active = entries.filter(e => !e.deleted);
  const stats = [
    { label: "قنوات ظاهرة", value: active.filter(e => !e.hidden).length, icon: Tv, tone: "green" },
    { label: "قنوات مخفية", value: active.filter(e => e.hidden).length, icon: Eye, tone: "cyan" },
    { label: "قنوات محذوفة", value: entries.length - active.length, icon: RotateCcw, tone: "red" },
    { label: "أقسام وتصنيفات", value: sections, icon: FolderOpen, tone: "violet" },
  ];
  return <>
    <div className="admin-stat-grid">{stats.map(({ label, value, icon: Icon, tone }) => <div className="admin-stat" data-tone={tone} key={label}><Icon /><div><strong>{value.toLocaleString("en-US")}</strong><p>{label}</p></div></div>)}</div>
    <section className="admin-overview"><h1><Crown />إدارة الموقع</h1><div className="admin-feature-grid">{adminAreas.filter(a => a.id !== "home").map(({ id, label, icon: Icon, tone }) => <Button key={id} variant="outline" className="admin-feature" data-tone={tone} onClick={() => onNavigate(id)}><Icon /><strong>{label}</strong><span>الدخول ←</span></Button>)}</div></section>
  </>;
}