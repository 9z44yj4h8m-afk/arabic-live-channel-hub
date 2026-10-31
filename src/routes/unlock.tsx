import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/unlock")({ staticData: { sitemap: false },
  beforeLoad: () => { throw redirect({ to: "/", replace: true }); },
  head: () => ({ meta: [{ title: "فتح التطبيق — ALMOGHANI IPTV" }, { name: "description", content: "الانتقال إلى الصفحة الرئيسية لتطبيق المغني." }, { property: "og:title", content: "فتح التطبيق — ALMOGHANI IPTV" }, { property: "og:description", content: "الانتقال إلى الصفحة الرئيسية لتطبيق المغني." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
});