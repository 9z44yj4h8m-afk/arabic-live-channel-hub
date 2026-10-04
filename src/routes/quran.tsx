import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Headphones, Search } from "lucide-react";
import { useEffect, useState } from "react";

import quranIcon from "@/assets/quran-icon.jpg";

type Surah = { number: number; name: string; numberOfAyahs: number; revelationType: string };
type Ayah = { numberInSurah: number; text: string };

export const Route = createFileRoute("/quran")({
  head: () => ({
    meta: [
      { title: "القرآن الكريم — ALMOGHANI" },
      { name: "description", content: "اقرأ سور القرآن الكريم واستمع إلى تلاوتها بصوت الشيخ مشاري العفاسي." },
      { property: "og:title", content: "القرآن الكريم — ALMOGHANI" },
      { property: "og:description", content: "قراءة واستماع لسور القرآن الكريم كاملة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuranPage,
});

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [current, setCurrent] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://api.alquran.cloud/v1/surah")
      .then((r) => r.json())
      .then((j) => {
        setSurahs(j.data);
        const n = Number(new URLSearchParams(window.location.search).get("s"));
        const hit = (j.data as Surah[]).find((s) => s.number === n);
        if (hit) setCurrent(hit);
      })
      .catch(() => setError("تعذّر تحميل قائمة السور."));
  }, []);

  useEffect(() => {
    if (!current) return;
    setLoading(true);
    setError("");
    fetch(`https://api.alquran.cloud/v1/surah/${current.number}/quran-uthmani`)
      .then((r) => r.json())
      .then((j) => {
        const list: Ayah[] = j.data.ayahs;
        if (current.number !== 1 && current.number !== 9 && list[0]) {
          list[0] = { ...list[0], text: list[0].text.split(" ").slice(4).join(" ").trim() };
        }
        setAyahs(list);
      })
      .catch(() => setError("تعذّر تحميل السورة."))
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [current]);

  const shown = surahs.filter((s) => s.name.includes(filter) || String(s.number) === filter.trim());

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-16 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <img src={quranIcon} alt="" width={816} height={816} className="h-10 w-10 rounded-lg object-cover" />
            <h1 className="text-lg font-black">القرآن الكريم</h1>
          </div>
          {current ? (
            <button type="button" onClick={() => { setCurrent(null); setAyahs([]); }} className="flex items-center gap-1.5 rounded-md border border-primary/60 px-3 py-1.5 text-sm font-bold hover:border-sky">
              <ArrowRight className="h-4 w-4" />السور
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-1.5 rounded-md border border-primary/60 px-3 py-1.5 text-sm font-bold hover:border-sky">
              <ArrowRight className="h-4 w-4" />الرئيسية
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {error && <p role="alert" className="font-bold text-signal">{error}</p>}

        {!current ? (
          <>
            <label className="portal-frame flex items-center gap-3 px-4 py-3">
              <Search className="h-4 w-4 text-sky" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ابحث باسم السورة أو رقمها" className="w-full bg-transparent outline-none placeholder:text-muted-foreground" />
            </label>
            {!surahs.length && !error && <p className="text-center text-muted-foreground">جارٍ تحميل السور…</p>}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {shown.map((s) => (
                <button key={s.number} type="button" onClick={() => setCurrent(s)} className="portal-frame flex items-center gap-3 p-3 text-right">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/25 font-display text-sm font-bold text-sky">{s.number}</span>
                  <span className="flex-1">
                    <span className="block font-black">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.revelationType === "Meccan" ? "مكية" : "مدنية"} · {s.numberOfAyahs} آية</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="portal-frame space-y-3 p-4 text-center">
              <h2 className="text-2xl font-black">{current.name}</h2>
              <p className="text-sm text-muted-foreground">{current.revelationType === "Meccan" ? "مكية" : "مدنية"} · {current.numberOfAyahs} آية</p>
              <p className="flex items-center justify-center gap-2 text-xs font-bold text-sky"><Headphones className="h-4 w-4" />تلاوة الشيخ مشاري العفاسي</p>
              <audio
                key={current.number}
                controls
                preload="metadata"
                className="w-full"
                onError={(e) => {
                  const el = e.currentTarget;
                  const fallback = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${current.number}.mp3`;
                  if (el.src !== fallback) { el.src = fallback; void el.play().catch(() => {}); }
                }}
                src={`https://cdn.mp3quran.net/audio/mishary-alafasy/r1/${String(current.number).padStart(3, "0")}.mp3`}
              />
            </div>
            <article className="portal-frame p-5 sm:p-8">
              {current.number !== 1 && current.number !== 9 && <p className="mb-6 text-center font-quran text-2xl">{BASMALA}</p>}
              {loading ? (
                <p className="text-center text-muted-foreground">جارٍ التحميل…</p>
              ) : (
                <p className="text-justify font-quran text-2xl leading-[2.4] sm:text-3xl">
                  {ayahs.map((a) => (
                    <span key={a.numberInSurah}>
                      {a.text} <span className="mx-1 text-xl text-sky">﴿{a.numberInSurah.toLocaleString("ar-EG")}﴾</span>{" "}
                    </span>
                  ))}
                </p>
              )}
            </article>
          </>
        )}
      </main>
    </div>
  );
}
