import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { addSection, moveSection, removeSection, sectionsSchema, type CatalogSection } from "@/lib/catalog-sections";
import type { CatalogEntry } from "@/lib/channel-catalog";

export function CatalogSectionsEditor({ sections, entries, onChange }: { sections: CatalogSection[]; entries: CatalogEntry[]; onChange: (sections: CatalogSection[], entries: CatalogEntry[]) => void }) {
  const [name, setName] = useState("");
  const [removing, setRemoving] = useState<string>();
  const [destination, setDestination] = useState("");
  const [error, setError] = useState("");
  function run(action: () => void) { try { action(); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "تعذّر التعديل"); } }
  const active = sections.filter((s) => !s.deleted);
  return <section aria-label="إدارة الأقسام" className="mb-6 border-y border-border py-4">
    <h2 className="mb-3 font-bold">إدارة الأقسام</h2>
    <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => { onChange(addSection(sections, name), entries); setName(""); }); }}>
      <input aria-label="اسم القسم الجديد" placeholder="اسم القسم الجديد" maxLength={40} required value={name} onChange={(e) => setName(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-surface px-3 text-sm" />
      <Button type="submit"><Plus />إضافة قسم</Button>
    </form>
    <div className="divide-y divide-border">{sections.map((s) => <div key={s.slug} className="py-2">
      <div className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1 break-words text-sm font-bold">{s.title} <span className="text-xs font-normal text-muted-foreground">{s.deleted ? "محذوف" : `${entries.filter((e) => !e.deleted && e.channel.category === s.category).length} قناة`}</span></span>
        {s.deleted ? <Button variant="outline" size="sm" onClick={() => run(() => onChange(sectionsSchema.parse(sections.map((r) => r.slug === s.slug ? { ...r, deleted: false } : r)), entries))}><RotateCcw />استرداد القسم</Button> : <>
          <Button variant="ghost" size="icon" aria-label={`رفع قسم ${s.title}`} title="رفع القسم" disabled={sections.indexOf(s) === 0} onClick={() => onChange(moveSection(sections, s.slug, -1), entries)}><ArrowUp /></Button>
          <Button variant="ghost" size="icon" aria-label={`خفض قسم ${s.title}`} title="خفض القسم" disabled={sections.indexOf(s) === sections.length - 1} onClick={() => onChange(moveSection(sections, s.slug, 1), entries)}><ArrowDown /></Button>
          <Button variant="ghost" size="icon" aria-label={`حذف قسم ${s.title}`} title="حذف القسم ونقل قنواته" disabled={active.length < 2} onClick={() => { setRemoving(s.slug); setDestination(active.find((a) => a.slug !== s.slug)?.category ?? ""); }}><Trash2 /></Button>
        </>}
      </div>
      {removing === s.slug && <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(() => { const next = removeSection(sections, entries, s.slug, destination); onChange(next.sections, next.entries); setRemoving(undefined); }); }}>
        <label className="grid w-full gap-2 text-sm">نقل قنوات القسم إلى<select aria-label="وجهة قنوات القسم المحذوف" className="h-10 rounded-md border border-input bg-surface px-3" value={destination} onChange={(e) => setDestination(e.target.value)}>{active.filter((a) => a.slug !== s.slug).map((a) => <option key={a.slug} value={a.category}>{a.title}</option>)}</select></label>
        <Button type="submit" variant="outline"><Trash2 />تأكيد حذف القسم ونقل القنوات</Button><Button type="button" variant="ghost" onClick={() => setRemoving(undefined)}><X />إلغاء</Button>
      </form>}
    </div>)}</div>
    {error && <p role="alert" className="mt-3 text-sm text-live">{error}</p>}
  </section>;
}