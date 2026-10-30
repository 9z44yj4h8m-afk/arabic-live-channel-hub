import { useMemo, useRef, useState } from "react";
import { FileUp, LoaderCircle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, type CatalogEntry } from "@/lib/channel-catalog";
import { appendImportedChannels, mapCsv, parseImportFile, previewImport, type CsvField, type ImportFile } from "@/lib/channel-import";
import type { ChannelCategory } from "@/lib/channels";

const fields: Array<[CsvField, string]> = [["name", "اسم القناة"], ["link", "رابط البث"], ["group", "القسم"], ["thumbnail", "الصورة"], ["description", "الوصف"]];
const inputClass = "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-sm outline-none focus:border-accent";

export function ChannelImporter({ entries, onImport, onClose }: { entries: CatalogEntry[]; onImport: (entries: CatalogEntry[]) => void; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ImportFile>();
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState<ChannelCategory>("عامة");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const preview = useMemo(() => previewImport(file?.rows || [], entries, fallback), [file, entries, fallback]);
  const valid = preview.filter((item) => !item.issue && item.channel);
  const chosen = valid.filter((item) => !excluded.has(item.row.line));
  const mappingMissing = file?.format === "csv" && (file.mapping.name < 0 || file.mapping.link < 0);
  async function readFile(selected: File | undefined) {
    if (!selected) return;
    setError(""); setFile(undefined); setLoading(true); setExcluded(new Set()); setPage(0);
    try {
      if (selected.size > 5 * 1024 * 1024) throw new Error("اختر ملفًا بحجم لا يتجاوز 5 ميجابايت.");
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
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold">استيراد القنوات من ملف</h2><Button variant="ghost" size="icon" aria-label="إغلاق الاستيراد" title="إغلاق" onClick={onClose}><X /></Button></div>
    <input ref={input} type="file" accept=".csv,.m3u,.m3u8,.txt,text/csv,audio/x-mpegurl" className="hidden" aria-label="ملف القنوات" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} />
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={loading} onClick={() => input.current?.click()}>{loading ? <LoaderCircle className="animate-spin" /> : <FileUp />}اختيار ملف CSV أو M3U</Button><span className="min-w-0 break-all text-sm text-muted-foreground">{filename}</span></div>
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