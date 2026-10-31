import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { LockKeyhole, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unlockSite } from "@/lib/site-gate.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({ meta: [{ title: "فتح التطبيق — ALMOGHANI IPTV" }, { name: "description", content: "دخول تطبيق المغني بالرقم السري." }, { property: "og:title", content: "فتح التطبيق — ALMOGHANI IPTV" }, { property: "og:description", content: "دخول تطبيق المغني بالرقم السري." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: UnlockPage,
});
function UnlockPage() {
  const router = useRouter(); const unlock = useServerFn(unlockSite);
  const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await unlock({ data: { password } }); setPassword(""); if (!result.ok) { setError("الرقم السري غير صحيح"); return; } await router.navigate({ to: "/" }); }
    catch { setError("تعذّر الدخول، حاول مجددًا"); } finally { setBusy(false); }
  }
  return <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground" dir="rtl"><div className="w-full max-w-sm text-center"><img src="/icon-192.png" alt="" className="mx-auto mb-6 size-24 object-contain" /><h1 className="font-display text-2xl font-bold" dir="ltr">ALMOGHANI IPTV</h1><LockKeyhole className="mx-auto my-6 size-9 text-accent" /><form onSubmit={submit} className="grid gap-4 text-right"><label className="grid gap-2 text-sm">الرقم السري<input aria-label="الرقم السري" type="password" inputMode="numeric" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="h-12 rounded-md border border-input bg-surface px-4 outline-none focus:border-accent" /></label><Button size="lg" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}دخول</Button></form>{error && <p role="alert" className="mt-4 text-sm text-accent">{error}</p>}</div></main>;
}