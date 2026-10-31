import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { LoaderCircle, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSubscriptionStatus, saveSubscription, syncSubscription } from "@/lib/xtream.functions";
import type { XtreamKind } from "@/lib/xtream";

export function SubscriptionEditor() {
  const statusFn = useServerFn(getSubscriptionStatus); const save = useServerFn(saveSubscription); const sync = useServerFn(syncSubscription);
  const status = useQuery({ queryKey: ["subscription-status"], queryFn: () => statusFn(), retry: false });
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [parent, setParent] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); setBusy(true); setMessage("");
    try { await save({ data: { revision: status.data?.revision ?? 0, credentials: { server: String(data.get("server")), username: String(data.get("username")), password: String(data.get("password")) } } }); form.reset(); await status.refetch(); setMessage("تم التحقق من الاشتراك وحفظه مشفرًا"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "لم يُحفظ الاشتراك"); } finally { setBusy(false); }
  }
  async function synchronize(kind: XtreamKind) {
    setBusy(true); setMessage("");
    try { const result = await sync({ data: { kind, parent: kind === "episode" ? parent : "" } }); await status.refetch(); setMessage(`تمت مزامنة ${result.count} عنصر`); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذّرت المزامنة"); } finally { setBusy(false); }
  }
  const input = "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 outline-none focus:border-accent";
  return <section className="grid gap-6"><h2 className="text-xl font-bold">اشتراك Smarters / Xtream</h2><p className="text-sm text-muted-foreground">{status.data?.configured ? "الاشتراك محفوظ" : "لا يوجد اشتراك محفوظ"}</p><form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm">عنوان الخادم HTTPS<input name="server" type="url" dir="ltr" required placeholder="https://" className={input} /></label><label className="grid gap-2 text-sm">اسم المستخدم<input name="username" autoComplete="off" required className={input} /></label><label className="grid gap-2 text-sm">كلمة مرور الاشتراك<input name="password" type="password" autoComplete="new-password" required className={input} /></label><Button type="submit" disabled={busy || !status.data}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />}تحقق وحفظ الاشتراك</Button></form><div className="flex flex-wrap gap-2">{([['live', 'القنوات'], ['movie', 'الأفلام'], ['series', 'المسلسلات']] as const).map(([kind, label]) => <Button key={kind} variant="outline" disabled={busy || !status.data?.configured} onClick={() => synchronize(kind)}><RefreshCw />مزامنة {label}</Button>)}</div><label className="grid gap-2 text-sm">معرف المسلسل لمزامنة مواسمه وحلقاته<input value={parent} onChange={e => setParent(e.target.value)} inputMode="numeric" className={input} /></label><Button variant="outline" disabled={busy || !/^\d+$/.test(parent) || !status.data?.configured} onClick={() => synchronize("episode")}><RefreshCw />مزامنة جميع الحلقات</Button><Link to="/subscription" className="text-accent underline">فتح محتوى الاشتراك</Link>{(message || status.error) && <p role="status" className="text-sm text-accent">{message || "تعذّر تحميل حالة الاشتراك"}</p>}</section>;
}