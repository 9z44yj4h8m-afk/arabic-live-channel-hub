import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IptvBrowser } from "@/components/iptv-browser";
import { LivePlayer } from "@/components/live-player";
import { SubscriptionSetup } from "@/components/subscription-setup";
import { useQueryClient } from "@tanstack/react-query";
import { getSubscriptionItems } from "@/lib/xtream.functions";
const itemsQuery = () => queryOptions({ queryKey: ["subscription-items", "live", ""], queryFn: () => getSubscriptionItems({ data: { kind: "live", parent: "" } }), staleTime: 0 });
export const Route = createFileRoute("/subscription")({ staticData: { sitemap: false }, loader: ({ context }) => context.queryClient.ensureQueryData(itemsQuery()), head: () => ({ meta: [{ title: "سمارت — البث المباشر | ALMOGHANI IPTV" }, { name: "description", content: "قنوات البث المباشر لاشتراك المغني." }, { property: "og:title", content: "سمارت — البث المباشر | ALMOGHANI IPTV" }, { property: "og:description", content: "قنوات البث المباشر لاشتراك المغني." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }), errorComponent: ({ reset }) => <div className="grid justify-items-center gap-4 p-8"><p>تعذّر تحميل القنوات حاليًا</p><Button onClick={reset}>حاول مجددًا</Button><Button asChild variant="outline"><Link to="/">الرئيسية</Link></Button></div>, component: SubscriptionPage });
function SubscriptionPage() {
  const router = useRouter(); const [setup, setSetup] = useState(false); const qc = useQueryClient();
  const { data } = useSuspenseQuery(itemsQuery());
  const items = data.map(r => ({ ...r, group: r.category, subtitle: "", thumb: "/icon-192.png" }));
  return <><nav className="flex flex-wrap items-center gap-2 bg-surface p-2" aria-label="محتوى الاشتراك"><Button asChild size="sm" variant="ghost"><Link to="/">الرئيسية</Link></Button><h1 className="px-2 font-bold">سمارت — البث المباشر</h1><Button size="sm" variant={setup ? "default" : "outline"} onClick={() => setSetup(!setup)}>إضافة اشتراك</Button></nav>{setup || !items.length ? <><SubscriptionSetup liveOnly onImported={() => { void qc.invalidateQueries({ queryKey: ["subscription-items"] }); setSetup(false); }} />{!setup && <p className="p-4 text-center text-muted-foreground">لا توجد قنوات مستوردة</p>}</> : <IptvBrowser title="سمارت" items={items} groups={[...new Set(items.map(r => r.group))]} storageKey="subscription-live" onBack={() => router.navigate({ to: "/" })} renderPlayer={item => <LivePlayer key={item.id} channel={{ id: item.id, name: item.name, category: item.category, description: "", thumbnail: "/icon-192.png", youtubeId: "", streamUrl: `/api/public/xtream?id=${item.id}` }} />} />}</>;
}