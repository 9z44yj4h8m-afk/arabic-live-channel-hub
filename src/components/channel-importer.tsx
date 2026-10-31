import { useMemo, useRef, useState } from "react";
import { FileUp, Link2, LoaderCircle, Plus, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fetchPlaylistFromUrl } from "@/lib/channel-import.functions";
import { Button } from "@/components/ui/button";
import { categories as defaultCategories, type CatalogEntry } from "@/lib/channel-catalog";
import { appendImportedChannels, mapCsv, parseImportFile, previewImport, type CsvField, type ImportFile } from "@/lib/channel-import";
import type { ChannelCategory } from "@/lib/channels";

const fields: Array<[CsvField, string]> = [["name", "اسم القناة"], ["link", "رابط البث"], ["group", "القسم"], ["thumbnail", "الصورة"], ["description", "الوصف"]];
const inputClass = "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-accent";

export function ChannelImporter({ entries, onImport, onClose, categories = [...defaultCategories] }: { categories?: string[]; entries: CatalogEntry[]; onImport: (entries: CatalogEntry[]) => void; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ImportFile>();
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState<ChannelCategory>(categories.includes("عامة") ? "عامة" : categories[0] ?? "");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const preview = useMemo(() => previewImport(file?.rows || [], entries, fallback, categories), [file, entries, fallback, categories]);
  const valid = preview.filter((item) => !item.issue && item.channel);
  const chosen = valid.filter((item) => !excluded.has(item.row.line));
  const mappingMissing = file?.format === "csv" && (file.mapping.name < 0 || file.mapping.link < 0);
  const fetchUrl = useServerFn(fetchPlaylistFromUrl);
  const [listUrl, setListUrl] = useState("");
  const [oneName, setOneName] = useState("");
  const [oneUrl, setOneUrl] = useState("");
  function load(text: string, name: string) {
    setError(""); setExcluded(new Set()); setPage(0);
    const parsed = parseImportFile(text);
    setFilename(name); setFile(parsed);
  }
  async function readUrl() {
    setError(""); setFile(undefined); setLoading(true);
    try { const r = await fetchUrl({ data: { url: listUrl.trim() } }); load(r.text, r.name); }
    catch (cause) { setError(cause instanceof Error ? cause.message.replace(/^\[.*?\]\s*/, "") : "تعذّر تحميل الرابط."); }
    finally { setLoading(false); }
  }
  function readOne() {
    const name = oneName.replace(/[\r\n,]+/g, " ").trim(); const link = oneUrl.trim();
    if (!name || !link) { setError("اكتب اسم القناة ورابطها."); return; }
    if (/[\s]/.test(link)) { setError("رابط القناة غير صالح."); return; }
    try { load(`#EXTM3U\n#EXTINF:-1,${name}\n${link}\n`, name); } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذّر قراءة القناة."); }
  }
  async function readFile(selected: File | undefined) {
    if (!selected) return;
    setError(""); setFile(undefined); setLoading(true); setExcluded(new Set()); setPage(0);
    try {
      if (selected.size > 50 * 1024 * 1024) throw new Error("اختر ملفًا بحجم لا يتجاوز 50 ميجابايت.");
      const parsed = parseImportFile(await selected.text());
      setFilename(selected.name); setFile(parsed);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذّر قراءة الملف."); }
    finally { setLoading(false); }
  }
  function apply() {
    try {
      const channels = chosen.flatMap((item) => item.channel ? [item.channel] : []);
      onImport(appendImportedChannels(entries, channels));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذّر إضافة القنوات."); }
  }
  return <section className="mb-6 min-w-0 border-y border-border py-5" aria-label="استيراد القنوات">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold">استيراد القنوات (ملف، رابط، أو قناة)</h2><Button variant="ghost" size="icon" aria-label="إغلاق الاستيراد" title="إغلاق" onClick={onClose}><X /></Button></div>
    <input ref={input} type="file" accept=".csv,.m3u,.m3u8,.txt,text/csv,audio/x-mpegurl" className="hidden" aria-label="ملف القنوات" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} />
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={loading} onClick={() => input.current?.click()}>{loading ? <LoaderCircle className="animate-spin" /> : <FileUp />}اختيار ملف CSV أو M3U</Button><span className="min-w-0 break-all text-sm text-muted-foreground">{filename}</span></div>
    <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={(e) => { e.preventDefault(); void readUrl(); }}>
      <label className="grid gap-2 text-sm sm:col-span-2">رابط قائمة قنوات (M3U أو CSV)</label>
      <input dir="ltr" type="url" required aria-label="رابط قائمة القنوات" placeholder="https://example.com/list.m3u" value={listUrl} onChange={(e) => setListUrl(e.target.value)} className={inputClass} />
      <Button type="submit" variant="outline" disabled={loading || !listUrl.trim()}>{loading ? <LoaderCircle className="animate-spin" /> : <Link2 />}استيراد من الرابط</Button>
    </form>
    <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); readOne(); }}>
      <label className="text-sm sm:col-span-3">إضافة قناة واحدة برابط</label>
      <input aria-label="اسم القناة" placeholder="اسم القناة" maxLength={120} value={oneName} onChange={(e) => setOneName(e.target.value)} className={inputClass} />
      <input dir="ltr" aria-label="رابط القناة" placeholder="https://.../live.m3u8 أو رابط يوتيوب" value={oneUrl} onChange={(e) => setOneUrl(e.target.value)} className={inputClass} />
      <Button type="submit" variant="outline" disabled={loading}><Plus />معاينة القناة</Button>
    </form>
    {file && <>
      {file.format === "csv" && <div className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="grid gap-2 text-sm">{label}{(key === "name" || key === "link") ? " *" : " (اختياري)"}<select aria-label={`عمود ${label}`} className={inputClass} value={file.mapping[key]} onChange={(event) => { const mapping = { ...file.mapping, [key]: Number(event.target.value) }; setFile({ ...file, mapping, rows: mapCsv({ ...file, mapping }) }); setExcluded(new Set()); }}><option value={-1}>اختيار العمود</option>{file.headers.map((header, index) => <option key={index} value={index}>{header || `عمود ${index + 1}`}</option>)}</select></label>)}</div>}
      <label className="mt-4 grid max-w-sm gap-2 text-sm">قسم القنوات غير المصنفة<select className={inputClass} value={fallback} onChange={(event) => setFallback(event.target.value as ChannelCategory)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      {!mappingMissing && <>
        <div className="my-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{preview.length} قناة · {valid.length} صالحة · {preview.length - valid.length} مستبعدة</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-accent" checked={valid.length > 0 && chosen.length === valid.length} disabled={!valid.length} onChange={(event) => setExcluded(event.target.checked ? new Set() : new Set(valid.map((item) => item.row.line)))} />تحديد القنوات الصالحة</label></div>
        <div className="divide-y divide-border">{preview.slice(page * 50, page * 50 + 50).map((item) => <div key={item.row.line} className="flex items-start gap-3 py-3"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-accent" aria-label={`استيراد ${item.row.name || `صف ${item.row.line}`}`} disabled={Boolean(item.issue)} checked={!item.issue && !excluded.has(item.row.line)} onChange={(event) => { const next = new Set(excluded); if (event.target.checked) next.delete(item.row.line); else next.add(item.row.line); setExcluded(next); }} /><div className="min-w-0 flex-1"><p className="break-words text-sm font-bold">{item.row.name || `صف ${item.row.line}`}</p><p className="mt-1 text-xs text-muted-foreground">{item.category}</p>{item.issue && <p className="mt-1 text-xs text-accent">{item.issue}</p>}</div></div>)}</div>
        {preview.length > 50 && <div className="my-3 flex items-center justify-between gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>السابق</Button><span className="text-sm">{page + 1} / {Math.ceil(preview.length / 50)}</span><Button variant="outline" disabled={(page + 1) * 50 >= preview.length} onClick={() => setPage(page + 1)}>التالي</Button></div>}
        <Button className="mt-4" disabled={!chosen.length} onClick={apply}><Plus />إضافة المحدد ({chosen.length}) للقائمة</Button>
      </>}
    </>}
    {error && <p role="alert" className="mt-4 text-sm text-accent">{error}</p>}
  </section>;
}