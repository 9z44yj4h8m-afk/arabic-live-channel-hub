import { useSuspenseQuery } from "@tanstack/react-query";
import { catalogSectionsQuery } from "@/lib/catalog-sections.query";
import { Link } from "@tanstack/react-router";
import { Clapperboard, Film, Home, Tv, Trophy, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteDesign } from "@/components/site-design-provider";

export function AppBottomNav({ rail = false }: { rail?: boolean }) {
  const design = useSiteDesign();
  const { data: sections } = useSuspenseQuery(catalogSectionsQuery);
  return (
    <nav dir="rtl" className={rail ? "gold-nav gold-nav-rail" : "gold-nav gold-nav-bottom"} aria-label="التنقل السريع">
      <Button asChild variant="outline" className="gold-control gold-nav-link"><Link to="/" activeOptions={{ exact: true }}><Home /><span>{design.labels.home}</span></Link></Button>
      <Button asChild variant="outline" className="gold-control gold-nav-link"><Link to="/live"><Tv /><span>القنوات</span></Link></Button>
      <Button asChild variant="outline" className="gold-control gold-nav-link"><Link to="/movies"><Film /><span>{design.labels.movies}</span></Link></Button>
      {sections.some(s => s.slug === "series" && !s.deleted) && <Button asChild variant="outline" className="gold-control gold-nav-link"><Link to="/channels/$section" params={{ section: "series" }}><Clapperboard /><span>{design.labels.series}</span></Link></Button>}
      {sections.some(s => s.slug === "sports" && !s.deleted) && <Button asChild variant="outline" className="gold-control gold-nav-link"><Link to="/channels/$section" params={{ section: "sports" }}><Trophy /><span>الرياضة</span></Link></Button>}
      {sections.some(s => s.slug === "news" && !s.deleted) && <Button asChild variant="outline" className="gold-control gold-nav-link"><Link to="/channels/$section" params={{ section: "news" }}><Newspaper /><span>الأخبار</span></Link></Button>}
    </nav>
  );
}