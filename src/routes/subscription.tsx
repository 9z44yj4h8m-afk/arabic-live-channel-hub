import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IptvBrowser } from "@/components/iptv-browser";
import { LivePlayer } from "@/components/live-player";
import { getSubscriptionItems } from "@/lib/xtream.functions";
import type { XtreamKind } from "@/lib/xtream";
const itemsQuery = (kind: XtreamKind, parent = "") => queryOptions({ queryKey: ["subscription-items", kind, parent], queryFn: () => getSubscriptionItems({ data: { kind, parent } }), staleTime: 0 });
export const Route = createFileRoute("/subscription")({ staticData: { sitemap: false }, loader: ({ context }) => context.queryClient.ensureQueryData(itemsQuery("live")), head: () => ({ meta: [{ title: "اشتراكي — ALMOGHANI IPTV" }, { name: "description", content: "قنوات وأفلام ومسلسلات اشتراك المغني الخاص." }, { property: "og:title", content: "اشتراكي — ALMOGHANI IPTV" }, { property: "og:description", content: "محتوى اشتراكك الخاص." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }), component: SubscriptionPage });
function SubscriptionPage() {
  const [kind, setKind] = useState<XtreamKind>("live"); const [parent, setParent] = useState(""); const router = useRouter();
  const { data } = useSuspenseQuery(itemsQuery(kind, parent));
  const items = data.map(r => ({ ...r, group: kind === "episode" ? `الموسم ${r.season}` : r.category, subtitle: kind === "series" ? `معرف المسلسل: ${r.remote_id}` : kind === "episode" ? `الحلقة ${r.episode}` : "", thumb: "/icon-192.png" }));
  return <><nav className="flex flex-wrap gap-2 bg-surface p-2" aria-label="محتوى الاشتراك">{([['live', 'القنوات'], ['movie', 'الأفلام'], ['series', 'المسلسلات']] as const).map(([k, label]) => <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => { setKind(k); setParent(""); }}>{label}</Button>)}</nav>{!items.length ? <main className="p-8 text-center text-muted-foreground">لا يوجد محتوى مستورد في هذا القسم</main> : <IptvBrowser key={`${kind}-${parent}`} title="اشتراكي" items={items} groups={[...new Set(items.map(r => r.group))]} storageKey={`subscription-${kind}`} onBack={() => kind === "episode" ? (setKind("series"), setParent("")) : router.navigate({ to: "/live" })} renderPlayer={item => kind === "series" ? <div className="grid justify-items-center gap-4 py-10"><img src="/icon-192.png" alt="" className="size-24" /><Button onClick={() => { setParent(item.remote_id); setKind("episode"); }}>المواسم والحلقات</Button></div> : <LivePlayer key={item.id} channel={{ id: item.id, name: item.name, category: item.category, description: "", thumbnail: "/icon-192.png", youtubeId: "", streamUrl: `/api/public/xtream?id=${item.id}${kind === "live" ? "" : "&format=video"}` }} />} />}</>;
}