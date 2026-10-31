import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, LoaderCircle, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryKeys, categoryLabelInput, assertUniqueLabel, defaultCategoryLabels, type CategoryKey } from "@/lib/category-labels";
import { categoryLabelsQuery } from "@/lib/category-labels.query";
import { saveCategoryLabel } from "@/lib/category-labels.functions";

const kindOf: Record<CategoryKey, string> = {
  home: "صفحة", live: "صفحة", movies: "صفحة", series: "قسم", news: "قسم", sports: "قسم", islamic: "قسم", kids: "قسم", general: "قسم", movieChannels: "قسم",
};

export function CategoryLabelsEditor() {
  const labels = useQuery(categoryLabelsQuery);
  const save = useServerFn(saveCategoryLabel);
  const client = useQueryClient();
  const [editing, setEditing] = useState<CategoryKey | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(key: CategoryKey) {
    setMessage(null);
    const parsed = categoryLabelInput.safeParse({ key, label: value });
    if (!parsed.success) return setMessage({ ok: false, text: parsed.error.issues[0]?.message ?? "اسم غير صالح" });
    if (!labels.data) return;
    try { assertUniqueLabel(labels.data, key, parsed.data.label); } catch (e) { return setMessage({ ok: false, text: (e as Error).message }); }
    setBusy(true);
    try {
      const next = await save({ data: parsed.data });
      client.setQueryData(categoryLabelsQuery.queryKey, next);
      setEditing(null);
      setMessage({ ok: true, text: `تم حفظ الاسم «${parsed.data.label}»` });
    } catch (e) {
      setMessage({ ok: false, text: `لم يتم الحفظ: ${e instanceof Error ? e.message : "خطأ غير معروف"}` });
    } finally { setBusy(false); }
  }

  if (labels.isPending) return <LoaderCircle className="mx-auto animate-spin text-accent" />;
  if (labels.isError) return <p role="alert" className="text-center text-sm text-accent">تعذّر تحميل التصنيفات</p>;
  return <section dir="rtl" aria-label="أسماء التصنيفات">
    <h2 className="mb-1 text-lg font-bold">أسماء التصنيفات</h2>
    <p className="mb-4 text-sm text-muted-foreground">الاسم الجديد يظهر فورًا في الموقع والتطبيق. القنوات والروابط لا تتغير.</p>
    {message && <p role={message.ok ? "status" : "alert"} className={`mb-3 rounded-md border px-3 py-2 text-sm ${message.ok ? "border-accent text-accent" : "border-live text-live"}`}>{message.text}</p>}
    <ul className="grid gap-2">
      {categoryKeys.map((key) => <li key={key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
        {editing === key ? <form className="flex w-full flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void submit(key); }}>
          <input autoFocus dir="rtl" aria-label={`الاسم الجديد لـ ${labels.data[key]}`} maxLength={40} value={value} onChange={(e) => setValue(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
          <Button type="submit" size="sm" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Check />}حفظ</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setEditing(null); setMessage(null); }}><X />إلغاء</Button>
        </form> : <>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">{labels.data[key]}</p><p className="mt-1 text-xs text-muted-foreground">{kindOf[key]} · الأصلي: {defaultCategoryLabels[key]}</p></div>
          <Button size="sm" variant="outline" aria-label={`تعديل اسم ${labels.data[key]}`} onClick={() => { setEditing(key); setValue(labels.data[key]); setMessage(null); }}><Pencil />تعديل الاسم</Button>
        </>}
      </li>)}
    </ul>
  </section>;
}
