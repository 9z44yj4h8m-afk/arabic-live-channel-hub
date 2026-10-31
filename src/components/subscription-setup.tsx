import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubscriptionEditor } from "@/components/subscription-editor";
import { getAdminSession, unlockAdmin } from "@/lib/channel-admin.functions";

export function SubscriptionSetup({ onImported, liveOnly = false }: { onImported: () => void; liveOnly?: boolean }) {
  const sessionFn = useServerFn(getAdminSession); const unlock = useServerFn(unlockAdmin);
  const session = useQuery({ queryKey: ["admin-session"], queryFn: () => sessionFn(), retry: false });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await unlock({ data: { password: String(new FormData(e.currentTarget).get("password")) } }); if (!r.ok) setError("كلمة مرور الإدارة غير صحيحة"); await session.refetch(); }
    catch { setError("تعذّر التحقق، حاول مجددًا"); } finally { setBusy(false); }
  }
  return <div className="mx-auto w-full max-w-lg p-4">{session.data?.unlocked ? <SubscriptionEditor liveOnly={liveOnly} onImported={onImported} /> : <form onSubmit={submit} className="grid gap-3"><h2 className="text-lg font-bold">إضافة اشتراك سمارت</h2><p className="text-sm text-muted-foreground">أدخل كلمة مرور الإدارة لإضافة اشتراكك أو تحديثه.</p><input name="password" type="password" required autoComplete="current-password" aria-label="كلمة مرور الإدارة" className="h-11 rounded-md border border-input bg-surface px-3" /><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <KeyRound />}متابعة</Button>{error && <p role="alert" className="text-sm text-accent">{error}</p>}</form>}</div>;
}
