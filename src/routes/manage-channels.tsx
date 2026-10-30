import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, FileUp, LoaderCircle, LogOut, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelImporter } from "@/components/channel-importer";
import { DesignEditor } from "@/components/design-editor";
import { getAdminSession, unlockAdmin, lockAdmin } from "@/lib/channel-admin.functions";
import { categories, channelFromForm, moveEntry, saveCatalogSchema, type CatalogEntry } from "@/lib/channel-catalog";
import { getAdminCatalog, saveAdminCatalog } from "@/lib/channel-catalog.functions";
import type { ChannelCategory } from "@/lib/channels";

export const Route = createFileRoute("/manage-channels")({
  head: () => ({ meta: [
    { title: "إدارة القنوات — ALMOGHANI" },
    { name: "description", content: "لوحة الإدارة الخاصة بقنوات المغني." },
    { property: "og:title", content: "إدارة القنوات — ALMOGHANI" },
    { property: "og:description", content: "لوحة الإدارة الخاصة بقنوات المغني." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow, noarchive" },
  ] }),
  component: ManagementPage,
});

function ManagementPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [password, setPassword] = useState("");
  const [area, setArea] = useState<"channels" | "design">("channels");
  const sessionFn = useServerFn(getAdminSession);
  const unlock = useServerFn(unlockAdmin);
  const lock = useServerFn(lockAdmin);
  const identity = useQuery({ queryKey: ["admin-identity"], queryFn: () => sessionFn(), retry: false });
  const fetchCatalog = useServerFn(getAdminCatalog);
  const catalog = useQuery({ queryKey: ["admin-catalog"], queryFn: () => fetchCatalog(), enabled: identity.data?.unlocked === true, retry: false });
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true); setMessage("");
    try {
      const result = await unlock({ data: { password } });
      setPassword("");
      if (!result.ok) { setMessage("الرقم السري غير صحيح."); return; }
      await queryClient.invalidateQueries({ queryKey: ["admin-identity"] });
    } catch { setMessage("تعذّر تسجيل الدخول. حاول مجددًا."); }
    finally { setSigningIn(false); }
  }
  async function signOut() {
    await queryClient.cancelQueries({ queryKey: ["admin-catalog"] });
    await lock();
    queryClient.setQueryData(["admin-identity"], { unlocked: false });
    queryClient.removeQueries({ queryKey: ["admin-catalog"] });
    queryClient.removeQueries({ queryKey: ["design-draft"] });
  }
  return <div className="min-h-screen bg-background text-foreground" dir="rtl">
    <header className="border-b border-border bg-surface px-4 py-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-3"><ShieldCheck className="size-7 text-accent" /><div><p className="text-xs font-bold text-accent" dir="ltr">ALMOGHANI</p><h1 className="text-xl font-bold">إدارة القنوات</h1></div></div>
        {identity.data?.unlocked && <Button variant="ghost" onClick={signOut} title="تسجيل الخروج" aria-label="تسجيل الخروج" size="icon"><LogOut /></Button>}
      </div>
    </header>
    <main className={`mx-auto px-4 py-6 ${area === "design" ? "max-w-7xl" : "max-w-4xl"}`}>
      {identity.data?.unlocked && <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4" role="tablist" aria-label="أقسام الإدارة"><Button role="tab" aria-selected={area === "channels"} variant={area === "channels" ? "default" : "outline"} onClick={() => setArea("channels")}>إدارة القنوات</Button><Button role="tab" aria-selected={area === "design"} variant={area === "design" ? "default" : "outline"} onClick={() => setArea("design")}>🎨 تعديل التصميم</Button></div>}
      {identity.isPending ? <LoaderCircle className="mx-auto animate-spin text-accent" /> : !identity.data?.unlocked ?
        <div className="mx-auto max-w-sm py-16 text-center">
          <ShieldCheck className="mx-auto mb-5 size-12 text-accent" /><h2 className="mb-6 text-xl font-bold">دخول الإدارة</h2>
          <form onSubmit={signIn} className="grid gap-3"><label className="grid gap-2 text-right text-sm">الرقم السري<input type="password" inputMode="numeric" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-accent" /></label><Button type="submit" size="lg" disabled={signingIn || identity.isError}>{signingIn ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}دخول</Button></form>
          {identity.isError && <p role="alert" className="mt-4 text-sm text-accent">تعذّر فتح اللوحة. أعد تحميل الصفحة.</p>}
          {message && <p role="alert" className="mt-4 text-sm text-accent">{message}</p>}
        </div> : area === "design" ? <DesignEditor /> : catalog.isPending ? <LoaderCircle className="mx-auto animate-spin text-accent" /> : catalog.error ?
        <div className="py-12 text-center"><ShieldCheck className="mx-auto mb-4 size-10 text-accent" /><h2 className="text-xl font-bold">تعذّر تحميل القنوات</h2><p className="mt-3 text-sm text-muted-foreground">حاول مجددًا أو أعد فتح اللوحة بالرقم السري.</p><Button className="mt-5" variant="outline" onClick={() => catalog.refetch()}>إعادة المحاولة</Button></div> : catalog.data ?
        <CatalogEditor initial={catalog.data} key={catalog.data.revision} /> : null}
    </main>
  </div>;
}

function CatalogEditor({ initial }: { initial: { entries: CatalogEntry[]; revision: number } }) {
  const [entries, setEntries] = useState(initial.entries);
  const [revision, setRevision] = useState(initial.revision);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"active" | "deleted">("active");
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [category, setCategory] = useState<ChannelCategory>("إخبارية");
  const save = useServerFn(saveAdminCatalog);
  const client = useQueryClient();
  const activeCount = entries.filter((e) => !e.deleted).length;
  const rows = [...entries].sort((a, b) => a.position - b.position).filter((e) => e.deleted === (tab === "deleted") && (!categoryFilter || e.channel.category === categoryFilter) && e.channel.name.includes(filter));
  function change(next: CatalogEntry[]) { setEntries(next); setDirty(true); setMessage(""); }
  async function handleSave() {
    setSaving(true); setMessage("");
    try {
      const result = await save({ data: saveCatalogSchema.parse({ entries, revision }) });
      setRevision(result.revision); setDirty(false); setMessage("تم حفظ التغييرات");
      await client.invalidateQueries({ queryKey: ["public-channels"] });
    } catch { setMessage("لم يتم الحفظ. أعد المحاولة، أو أعد تحميل الصفحة إذا عدّلت من جهاز آخر."); }
    finally { setSaving(false); }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const channel = channelFromForm(String(form.get("name")), category, String(form.get("link")), String(form.get("description") || ""), String(form.get("thumbnail") || ""));
      change([...entries, { channel, position: entries.length, deleted: false }]); setAdding(false); setTab("active"); setFilter(""); setCategoryFilter(category);
    } catch (error) { setMessage(error instanceof Error && !error.message.startsWith("[") ? error.message : "تحقق من اسم القناة والرابط."); }
  }
  function toggleSelected(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }
  function deleteSelected() {
    change(entries.map((e) => selected.has(e.channel.id) && !e.deleted ? { ...e, deleted: true } : e));
    setSelected(new Set());
  }
  function toggleSelectedVisibility() {
    const hide = !entries.filter((e) => !e.deleted && selected.has(e.channel.id)).every((e) => e.hidden);
    change(entries.map((e) => selected.has(e.channel.id) && !e.deleted ? { ...e, hidden: hide } : e));
    setSelected(new Set());
  }
  const allSelectedHidden = selected.size > 0 && entries.filter((e) => !e.deleted && selected.has(e.channel.id)).every((e) => e.hidden);
  const inputClass = "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-accent";
  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{activeCount} قناة <span className="mx-2">·</span> {dirty ? "تغييرات غير محفوظة" : "القائمة محفوظة"}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving} onClick={() => { setImporting(true); setAdding(false); }}><FileUp />استيراد ملف</Button><Button onClick={() => { setAdding(true); setImporting(false); }}><Plus />إضافة قناة</Button></div></div>
    {importing && <ChannelImporter entries={entries} onClose={() => setImporting(false)} onImport={(next) => { change(next); setImporting(false); setTab("active"); setFilter(""); setCategoryFilter(""); setSelected(new Set()); setMessage(`تمت إضافة ${next.length - entries.length} قناة؛ اضغط حفظ لاعتمادها.`); }} />}
    {adding && <form onSubmit={add} className="mb-6 border-y border-border py-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">قناة جديدة</h2><Button type="button" variant="ghost" size="icon" aria-label="إغلاق الإضافة" title="إغلاق" onClick={() => setAdding(false)}><X /></Button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">اسم القناة<input name="name" required maxLength={120} className={inputClass} /></label>
        <label className="grid gap-2 text-sm">القسم<select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as ChannelCategory)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="grid gap-2 text-sm sm:col-span-2">رابط البث أو يوتيوب<input name="link" type="url" dir="ltr" required maxLength={2048} placeholder="https://" className={inputClass} /></label>
        <label className="grid gap-2 text-sm">الوصف (اختياري)<input name="description" maxLength={240} className={inputClass} /></label>
        <label className="grid gap-2 text-sm">رابط الصورة (اختياري)<input name="thumbnail" type="url" dir="ltr" maxLength={2048} className={inputClass} /></label>
      </div><Button type="submit" className="mt-4"><Plus />إضافة للقائمة</Button>
    </form>}
    <div className="mb-4 flex border-b border-border" role="tablist" aria-label="حالة القنوات">{(["active", "deleted"] as const).map((value) => <Button key={value} role="tab" aria-selected={tab === value} variant="ghost" className={`rounded-none border-b-2 ${tab === value ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`} onClick={() => { setTab(value); setSelected(new Set()); }}>{value === "active" ? `القنوات (${activeCount})` : `المحذوفة (${entries.length - activeCount})`}</Button>)}</div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="relative"><Search className="absolute right-3 top-3 size-5 text-muted-foreground" /><input aria-label="بحث عن قناة" placeholder="بحث عن قناة" value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputClass} pr-10`} /></label><select aria-label="تصفية القسم" className={inputClass} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">كل الأقسام</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
    {tab === "active" && rows.length > 0 && <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-5 accent-accent" checked={rows.every((r) => selected.has(r.channel.id))} onChange={(e) => { const next = new Set(selected); rows.forEach((r) => { if (e.target.checked) next.add(r.channel.id); else next.delete(r.channel.id); }); setSelected(next); }} />تحديد الكل</label>
      <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={!selected.size} onClick={toggleSelectedVisibility}>{allSelectedHidden ? <Eye /> : <EyeOff />}{selected.size ? `${allSelectedHidden ? "إظهار" : "إخفاء"} المحدد (${selected.size})` : "إظهار/إخفاء المحدد"}</Button>
      <Button variant="outline" size="sm" disabled={!selected.size} onClick={deleteSelected}><Trash2 />{selected.size ? `حذف المحدد (${selected.size})` : "حذف المحدد"}</Button>
      </div>
    </div>}
    <div className="divide-y divide-border">{rows.map((entry) => <div key={entry.channel.id} className="flex items-center gap-3 py-3">
      {!entry.deleted && <input type="checkbox" className="size-5 shrink-0 accent-accent" aria-label={`تحديد ${entry.channel.name}`} checked={selected.has(entry.channel.id)} onChange={() => toggleSelected(entry.channel.id)} />}
      <img src={entry.channel.thumbnail} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/icon-192.png"; }} className="h-12 w-16 shrink-0 rounded-md bg-surface object-contain" />
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{entry.channel.name}{entry.hidden && !entry.deleted && <span className="ms-2 text-xs font-normal text-accent">مخفية عن الشاشة</span>}</p><p className="mt-1 text-xs text-muted-foreground">{entry.channel.category}</p></div>
      <div className="flex shrink-0 gap-1">{entry.deleted ? <Button variant="outline" size="sm" onClick={() => change(entries.map((e) => e.channel.id === entry.channel.id ? { ...e, deleted: false } : e))}><RotateCcw />استرداد</Button> : <>
        <Button variant="ghost" size="icon" aria-label={`${entry.hidden ? "إظهار" : "إخفاء"} ${entry.channel.name}`} title={entry.hidden ? "إظهار في شاشة العرض" : "إخفاء من شاشة العرض"} onClick={() => change(entries.map((e) => e.channel.id === entry.channel.id ? { ...e, hidden: !e.hidden } : e))}>{entry.hidden ? <EyeOff /> : <Eye />}</Button>
        <Button variant="ghost" size="icon" aria-label={`رفع ${entry.channel.name}`} title="رفع" onClick={() => change(moveEntry(entries, entry.channel.id, -1))}><ArrowUp /></Button>
        <Button variant="ghost" size="icon" aria-label={`خفض ${entry.channel.name}`} title="خفض" onClick={() => change(moveEntry(entries, entry.channel.id, 1))}><ArrowDown /></Button>
        <Button variant="ghost" size="icon" aria-label={`حذف ${entry.channel.name}`} title="حذف" onClick={() => change(entries.map((e) => e.channel.id === entry.channel.id ? { ...e, deleted: true } : e))}><Trash2 /></Button>
      </>}</div>
    </div>)}</div>
    {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">{tab === "deleted" ? "لا توجد قنوات محذوفة" : "لا توجد قنوات مطابقة"}</p>}
    <footer className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
      <p role="status" className="text-sm text-accent">{message || (dirty ? "تغييرات غير محفوظة" : "")}</p>
      <Button size="lg" disabled={!dirty || saving} onClick={handleSave}>{saving ? <LoaderCircle className="animate-spin" /> : dirty ? <Save /> : <Check />}{saving ? "جارٍ الحفظ" : "حفظ"}</Button>
    </footer>
  </>;
}