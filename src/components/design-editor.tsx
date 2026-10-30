import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, Save, Upload, RotateCcw, Undo2, Redo2, Smartphone, Tablet, Monitor, Tv, Plus, Trash2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDesignDraft, saveDesignDraft } from "@/lib/site-design.functions";
import { clampElement, defaultDesign, designPages, pageNames, resolveDesign, safeImageUrl, siteDesignSchema, type DesignElement, type DesignPage, type DesignSettings, type SiteDesign } from "@/lib/site-design";

const tabs = ["الثيم والألوان", "الخطوط والنصوص", "الصور والشعارات والخلفيات", "التخطيط والمقاسات", "العناصر", "الحركة والمؤثرات"];
const inputClass = "h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm";
const viewports = [{ name: "الجوال", width: 390, height: 844, icon: Smartphone }, { name: "اللوحي", width: 768, height: 1024, icon: Tablet }, { name: "الكمبيوتر", width: 1280, height: 900, icon: Monitor }, { name: "التلفزيون", width: 1920, height: 1080, icon: Tv }] as const;
const pagePaths: Record<DesignPage, string> = { home: "/", live: "/live", movies: "/movies", news: "/channels/news", sports: "/channels/sports", islamic: "/channels/islamic", series: "/channels/series", kids: "/channels/kids", general: "/channels/general", movieChannels: "/channels/movies" };
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid min-w-0 gap-2 text-sm"><span>{label}</span>{children}</label>; }
function NumberControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <Field label={label}><div className="flex items-center gap-2"><input aria-label={label} type="range" className="min-w-0 flex-1 accent-accent" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /><output className="w-12 shrink-0 text-center text-xs text-accent">{value}</output></div></Field>;
}
function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <Field label={label}><select aria-label={label} className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></Field>;
}

export function DesignEditor() {
  const load = useServerFn(getDesignDraft);
  const query = useQuery({ queryKey: ["design-draft"], queryFn: () => load(), retry: false });
  if (query.isPending) return <LoaderCircle className="mx-auto animate-spin text-accent" />;
  if (!query.data) return <div role="alert" className="py-8 text-center"><p>تعذّر تحميل مسودة التصميم.</p><Button variant="outline" className="mt-3" onClick={() => query.refetch()}>إعادة المحاولة</Button></div>;
  return <Editor initial={query.data.config} initialRevision={query.data.revision} />;
}

function Editor({ initial, initialRevision }: { initial: SiteDesign; initialRevision: number }) {
  const [history, setHistory] = useState<SiteDesign[]>([initial]);
  const [cursor, setCursor] = useState(0);
  const [revision, setRevision] = useState(initialRevision);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [page, setPage] = useState<DesignPage>("home");
  const [scope, setScope] = useState<"global" | "page">("global");
  const [tab, setTab] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [previewOpen, setPreviewOpen] = useState(true);
  const [imageValues, setImageValues] = useState<Record<string, string>>({});
  const iframe = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(600);
  const save = useServerFn(saveDesignDraft);
  const client = useQueryClient();
  const config = history[cursor] || initial;
  const settings = scope === "global" ? config.global : config.pages[page].settings;
  const previewSettings = resolveDesign(config, page);
  const dirty = JSON.stringify(config) !== saved;
  function commit(next: SiteDesign) {
    const result = siteDesignSchema.safeParse(next);
    if (!result.success) { setMessage("قيمة غير صالحة؛ تحقق من حدود المقاسات وروابط الصور."); return; }
    const updated = [...history.slice(0, cursor + 1), result.data].slice(-60);
    setHistory(updated); setCursor(updated.length - 1); setMessage("");
  }
  function update(next: DesignSettings) {
    commit({ ...config, customized: true, ...(scope === "global" ? { global: next } : { pages: { ...config.pages, [page]: { enabled: true, settings: next } } }) });
  }
  function setGroup<K extends keyof DesignSettings>(group: K, value: DesignSettings[K]) { update({ ...settings, [group]: value }); }
  function sendPreview() { iframe.current?.contentWindow?.postMessage({ type: "almoghani-design-preview", config }, window.location.origin); }
  useEffect(() => { sendPreview(); }, [config, viewport, page]);
  useEffect(() => {
    const timer = setInterval(sendPreview, 1000);
    return () => clearInterval(timer);
  }, [config, previewOpen]);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailableWidth(entry.contentRect.width); });
    observer.observe(node); return () => observer.disconnect();
  }, [previewOpen]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function persist(publish: boolean) {
    if (publish && !window.confirm("نشر هذا التصميم لجميع الزوار والأجهزة؟")) return;
    setBusy(true); setMessage("");
    try {
      const result = await save({ data: { config, revision, publish } });
      setRevision(result.revision); setSaved(JSON.stringify(config));
      client.setQueryData(["design-draft"], { config, revision: result.revision });
      if (publish) await client.invalidateQueries({ queryKey: ["published-design"] });
      setMessage(publish ? "نُشر التصميم؛ سيظهر للأجهزة الأخرى عند تحديث الصفحة." : "حُفظت المسودة؛ لم يتغير تصميم الجمهور.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "تعذّر حفظ التصميم."); }
    finally { setBusy(false); }
  }
  function addElement(type: DesignElement["type"]) {
    if (settings.elements.length >= 30) { setMessage("يمكن إضافة 30 عنصرًا لكل تصميم."); return; }
    const element: DesignElement = { id: crypto.randomUUID(), type, text: type === "button" ? "ALMOGHANI" : type === "text" ? "نص جديد" : "", image: "", color: settings.colors.text, background: settings.colors.surface, x: 10, y: 10, width: 30, height: 25, fontSize: 20, radius: 8 };
    setGroup("elements", [...settings.elements, element]); setSelected(element.id);
  }
  const active = settings.elements.find((element) => element.id === selected);
  function editElement(next: DesignElement) { setGroup("elements", settings.elements.map((element) => element.id === next.id ? clampElement(next) : element)); }
  const device = viewports[viewport] || viewports[0];
  const scale = Math.min(1, availableWidth / device.width);
  const colorLabels: Record<keyof DesignSettings["colors"], string> = { background: "الخلفية", surface: "المربعات والأسطح", text: "النص", muted: "النص الثانوي", primary: "الأزرار والذهبي", buttonText: "نص الأزرار", border: "الحواف", neon: "النيون والتوهج", shadow: "الظل", gradientEnd: "نهاية التدرج" };
  const imageLabels: Record<keyof DesignSettings["images"], string> = { background: "الخلفية", logo: "الشعار", wolf: "الذئب", live: "بطاقة البث", movies: "بطاقة الأفلام", series: "بطاقة المسلسلات", shield: "درع التنقل" };
  const controls = useMemo(() => ({ layout: settings.layout, effects: settings.effects }), [settings]);
  return <section dir="rtl" aria-label="محرر التصميم" className="min-w-0 overflow-x-clip">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-bold text-accent">🎨 تعديل التصميم</h2><p className="mt-2 text-sm text-muted-foreground">{dirty ? "تغييرات غير محفوظة" : "المسودة محفوظة"} · إصدار {revision}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="icon" title="تراجع" aria-label="تراجع" disabled={!cursor || busy} onClick={() => setCursor(cursor - 1)}><Undo2 /></Button><Button variant="outline" size="icon" title="إعادة" aria-label="إعادة" disabled={cursor >= history.length - 1 || busy} onClick={() => setCursor(cursor + 1)}><Redo2 /></Button><Button variant="outline" onClick={() => setPreviewOpen(!previewOpen)}><Eye />معاينة</Button></div></div>
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><SelectControl label="الصفحة المراد تعديلها" value={page} options={designPages.map((value) => [value, pageNames[value]])} onChange={(value) => { setPage(value as DesignPage); setSelected(undefined); setImageValues({}); }} /><SelectControl label="نطاق التعديل" value={scope} options={[["global", "إعدادات عامة مشتركة"], ["page", "تخصيص هذه الصفحة"]]} onChange={(value) => { setScope(value as "global" | "page"); setSelected(undefined); setImageValues({}); }} /></div>
    {scope === "page" && <label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-accent" checked={config.pages[page].enabled} onChange={(event) => commit({ ...config, customized: true, pages: { ...config.pages, [page]: { enabled: event.target.checked, settings: config.pages[page].enabled ? settings : structuredClone(config.global) } } })} />استخدام تخصيص مستقل لهذه الصفحة</label>}
    <div className="mb-5 flex flex-wrap gap-1 border-b border-border pb-3" role="tablist" aria-label="أدوات التصميم">{tabs.map((title, index) => <Button key={title} role="tab" aria-selected={tab === index} variant={tab === index ? "default" : "ghost"} size="sm" onClick={() => setTab(index)}>{title}</Button>)}</div>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div role="tabpanel" className="min-w-0 space-y-4">
        {tab === 0 && <div className="grid grid-cols-2 gap-4">{Object.entries(colorLabels).map(([key, label]) => <Field key={key} label={label}><input type="color" aria-label={label} className="h-11 w-full cursor-pointer rounded-md border border-input bg-background p-1" value={settings.colors[key as keyof typeof colorLabels]} onChange={(event) => setGroup("colors", { ...settings.colors, [key]: event.target.value })} /></Field>)}</div>}
        {tab === 1 && <>
          <SelectControl label="الخط" value={settings.typography.font} options={[["original", "خط ALMOGHANI الأصلي"], ["arabic", "عربي واضح"], ["serif", "عربي كلاسيكي"], ["system", "خط الجهاز"]]} onChange={(value) => setGroup("typography", { ...settings.typography, font: value as DesignSettings["typography"]["font"] })} />
          <NumberControl label="حجم النص" value={settings.typography.size} min={12} max={24} onChange={(size) => setGroup("typography", { ...settings.typography, size })} />
          <NumberControl label="حجم العناوين" value={settings.typography.titleSize} min={16} max={48} onChange={(titleSize) => setGroup("typography", { ...settings.typography, titleSize })} />
          <SelectControl label="وزن الخط" value={settings.typography.weight} options={[["400", "عادي"], ["600", "متوسط"], ["700", "عريض"], ["800", "عريض جدًا"]]} onChange={(value) => setGroup("typography", { ...settings.typography, weight: value as DesignSettings["typography"]["weight"] })} />
          <SelectControl label="محاذاة العناوين" value={settings.typography.align} options={[["right", "يمين"], ["center", "وسط"], ["left", "يسار"]]} onChange={(value) => setGroup("typography", { ...settings.typography, align: value as DesignSettings["typography"]["align"] })} />
          {designPages.map((key) => <Field key={key} label={`عنوان ${pageNames[key]}`}><input aria-label={`عنوان ${pageNames[key]}`} className={inputClass} maxLength={120} value={settings.labels[key]} onChange={(event) => setGroup("labels", { ...settings.labels, [key]: event.target.value })} /></Field>)}
        </>}
        {tab === 2 && <><p className="text-xs text-muted-foreground">روابط صور HTTPS؛ ترك الرابط فارغًا يُبقي الصورة الأصلية.</p>{Object.entries(imageLabels).map(([key, label]) => <Field key={key} label={label}><input aria-label={`رابط ${label}`} dir="ltr" type="url" maxLength={2048} placeholder="https://" className={inputClass} value={imageValues[key] ?? settings.images[key as keyof typeof imageLabels]} onChange={(event) => { const value = event.target.value; setImageValues({ ...imageValues, [key]: value }); if (safeImageUrl.safeParse(value).success) setGroup("images", { ...settings.images, [key]: value }); }} />{imageValues[key] && !safeImageUrl.safeParse(imageValues[key]).success && <span className="text-xs text-accent">الرابط غير آمن؛ لم يُطبّق.</span>}</Field>)}</>}
        {tab === 3 && <>
          {([['maxWidth', 'عرض الصفحة', 320, 1920], ['playerWidth', 'عرض شاشة البث', 320, 1600], ['gap', 'تباعد الأقسام والمربعات', 0, 80], ['radius', 'استدارة الحواف', 0, 48], ['cardHeight', 'ارتفاع صور بطاقات الأقسام', 100, 420], ['logoHeight', 'ارتفاع الشعار', 48, 280], ['columns', 'عدد الأعمدة', 1, 8], ['stageHeight', 'ارتفاع مساحة العناصر', 160, 800]] as const).map(([key, label, min, max]) => <NumberControl key={key} label={label} value={controls.layout[key]} min={min} max={max} onChange={(value) => setGroup("layout", { ...settings.layout, [key]: value })} />)}
          <SelectControl label="نسبة شاشة البث" value={settings.layout.ratio} options={[["16/9", "16:9"], ["4/3", "4:3"], ["21/9", "21:9"], ["1/1", "1:1"]]} onChange={(value) => setGroup("layout", { ...settings.layout, ratio: value as DesignSettings["layout"]["ratio"] })} />
          <SelectControl label="موقع الشعار" value={settings.layout.logoPosition} options={[["center", "وسط"], ["right", "يمين"], ["left", "يسار"]]} onChange={(value) => setGroup("layout", { ...settings.layout, logoPosition: value as DesignSettings["layout"]["logoPosition"] })} />
        </>}
        {tab === 4 && <>
          {([["logo", "الشعار"], ["wolf", "الذئب"], ["cards", "بطاقات الأقسام"], ["lists", "قوائم القنوات والأفلام"], ["icons", "الأيقونات"], ["nav", "شريط التنقل"], ["header", "القائمة العلوية"]] as const).map(([key, label]) => <label className="flex items-center justify-between gap-3 text-sm" key={key}>{label}<input type="checkbox" className="size-5 accent-accent" checked={settings.visible[key]} onChange={(event) => setGroup("visible", { ...settings.visible, [key]: event.target.checked })} /></label>)}
          <div className="flex flex-wrap gap-2">{([["text", "نص"], ["image", "صورة"], ["shape", "شكل"], ["button", "زر تجميلي"]] as const).map(([type, label]) => <Button key={type} variant="outline" size="sm" onClick={() => addElement(type)}><Plus />{label}</Button>)}</div>
          <ElementCanvas elements={settings.elements} height={settings.layout.stageHeight} selected={selected} onSelect={setSelected} onChange={editElement} background={settings.colors.background} />
          {active && <>
            <Field label="نص العنصر"><input aria-label="نص العنصر" maxLength={120} className={inputClass} value={active.text} onChange={(event) => editElement({ ...active, text: event.target.value })} /></Field>
            {active.type === "image" && <Field label="رابط صورة العنصر"><input dir="ltr" type="url" className={inputClass} defaultValue={active.image} key={active.id} onBlur={(event) => { if (safeImageUrl.safeParse(event.target.value).success) editElement({ ...active, image: event.target.value }); else setMessage("رابط صورة العنصر غير آمن."); }} /></Field>}
            <div className="grid grid-cols-2 gap-3"><Field label="لون العنصر"><input type="color" aria-label="لون العنصر" value={active.color} onChange={(event) => editElement({ ...active, color: event.target.value })} /></Field><Field label="خلفية العنصر"><input type="color" aria-label="خلفية العنصر" value={active.background} onChange={(event) => editElement({ ...active, background: event.target.value })} /></Field></div>
            {([["x", "موضع أفقي (%)", 0, 95], ["y", "موضع عمودي (%)", 0, 95], ["width", "عرض العنصر (%)", 5, 100], ["height", "ارتفاع العنصر (%)", 5, 100], ["fontSize", "حجم خط العنصر", 10, 64], ["radius", "حواف العنصر", 0, 48]] as const).map(([key, label, min, max]) => <NumberControl key={key} label={label} value={active[key]} min={min} max={max} onChange={(value) => editElement({ ...active, [key]: value })} />)}
            <Button variant="outline" onClick={() => { setGroup("elements", settings.elements.filter((element) => element.id !== active.id)); setSelected(undefined); }}><Trash2 />حذف العنصر</Button>
          </>}
        </>}
        {tab === 5 && <>
          <NumberControl label="شدة التوهج" value={controls.effects.glow} min={0} max={80} onChange={(glow) => setGroup("effects", { ...settings.effects, glow })} />
          <NumberControl label="شدة الظل" value={controls.effects.shadow} min={0} max={80} onChange={(shadow) => setGroup("effects", { ...settings.effects, shadow })} />
          <NumberControl label="مدة الانتقال (مللي ثانية)" value={controls.effects.transition} min={0} max={1500} onChange={(transition) => setGroup("effects", { ...settings.effects, transition })} />
          <SelectControl label="الحركة" value={settings.effects.animation} options={[["none", "بدون حركة"], ["fade", "ظهور تدريجي"], ["pulse", "نبض ضوئي"]]} onChange={(value) => setGroup("effects", { ...settings.effects, animation: value as DesignSettings["effects"]["animation"] })} />
          <label className="flex items-center justify-between gap-3 text-sm">تدرج الخلفية<input type="checkbox" className="size-5 accent-accent" checked={settings.effects.gradient} onChange={(event) => setGroup("effects", { ...settings.effects, gradient: event.target.checked })} /></label>
        </>}
      </div>
      {previewOpen && <div className="min-w-0" ref={container}>
        <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="مقاس المعاينة">{viewports.map((device, index) => <Button key={device.name} size="sm" variant={viewport === index ? "default" : "outline"} onClick={() => setViewport(index)}><device.icon />{device.name}</Button>)}</div>
        <p className="mb-3 text-xs text-muted-foreground">معاينة الصفحة الفعلية · {device.width} × {device.height}{scope === "global" && config.pages[page].enabled ? " · هذه الصفحة تستخدم تخصيصًا مستقلًا" : ""}</p>
        <div className="relative mx-auto overflow-hidden rounded-md border border-border bg-surface" style={{ width: device.width * scale, height: device.height * scale }}>
          <iframe ref={iframe} title="معاينة تصميم ALMOGHANI" src={pagePaths[page]} onLoad={sendPreview} className="absolute left-0 top-0 origin-top-left border-0" style={{ width: device.width, height: device.height, transform: `scale(${scale})` }} />
        </div>
        {previewSettings.elements.length > 0 && <p className="mt-3 text-xs text-muted-foreground">العناصر المستقلة تظهر أسفل محتوى الصفحة.</p>}
      </div>}
    </div>
    <footer className="sticky bottom-0 z-50 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur"><p role="status" className="max-w-xl text-sm text-accent">{message}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { if (window.confirm("استعادة التصميم الأصلي في المسودة فقط؟")) commit(defaultDesign()); }}><RotateCcw />استعادة الافتراضي</Button><Button variant="outline" disabled={busy} onClick={() => persist(false)}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />}حفظ المسودة</Button><Button disabled={busy} onClick={() => persist(true)}><Upload />نشر التصميم</Button></div></footer>
  </section>;
}

function ElementCanvas({ elements, height, selected, onSelect, onChange, background }: { elements: DesignElement[]; height: number; selected: string | undefined; onSelect: (id: string) => void; onChange: (element: DesignElement) => void; background: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ element: DesignElement; x: number; y: number; resize: boolean } | undefined>(undefined);
  const [temporary, setTemporary] = useState<DesignElement>();
  return <div ref={stage} role="group" aria-label="مساحة تحرير العناصر" className="relative overflow-hidden rounded-md border border-border" style={{ height: Math.min(height, 400), background }} onPointerMove={(event) => {
    const current = drag.current; const bounds = stage.current?.getBoundingClientRect();
    if (!current || !bounds) return;
    const dx = (event.clientX - current.x) / bounds.width * 100; const dy = (event.clientY - current.y) / bounds.height * 100;
    setTemporary(clampElement({ ...current.element, ...(current.resize ? { width: current.element.width + dx, height: current.element.height + dy } : { x: current.element.x + dx, y: current.element.y + dy }) }));
  }} onPointerUp={() => { if (temporary) onChange(temporary); drag.current = undefined; setTemporary(undefined); }} onPointerCancel={() => { drag.current = undefined; setTemporary(undefined); }}>
    {elements.map((item) => {
      const element = temporary?.id === item.id ? temporary : item;
      return <div key={element.id} role="button" tabIndex={0} aria-label={`عنصر ${element.text || element.type}`} className={`design-element cursor-move touch-none border-2 ${selected === element.id ? "border-accent" : "border-transparent"}`} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, color: element.color, background: element.background, fontSize: element.fontSize, borderRadius: element.radius }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(element.id); const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }; const direction = directions[event.key]; if (direction) { event.preventDefault(); onChange(clampElement({ ...element, x: element.x + direction[0], y: element.y + direction[1] })); } }} onPointerDown={(event) => { event.preventDefault(); onSelect(element.id); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { element, x: event.clientX, y: event.clientY, resize: false }; }}>
        {element.type === "image" ? (element.image && <img draggable={false} src={element.image} alt={element.text} className="pointer-events-none h-full w-full object-contain" />) : element.type === "shape" ? null : <span className="pointer-events-none">{element.text}</span>}
        {selected === element.id && <span role="button" aria-label="تغيير حجم العنصر" className="absolute bottom-0 right-0 size-5 cursor-se-resize bg-accent" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { element, x: event.clientX, y: event.clientY, resize: true }; }} />}
      </div>;
    })}
  </div>;
}