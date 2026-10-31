import { useSuspenseQuery } from "@tanstack/react-query";
import { catalogSectionsQuery } from "@/lib/catalog-sections.query";
import { Link } from "@tanstack/react-router";
import { Clapperboard, Film, Home, Tv } from "lucide-react";
import tplShield from "@/assets/tpl-shield.png";
import { useSiteDesign } from "@/components/site-design-provider";

export function AppBottomNav() {
  const design = useSiteDesign();
  const { data: sections } = useSuspenseQuery(catalogSectionsQuery);
  return (
    <nav dir="rtl" className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4.5rem+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="التنقل السريع">
      <Link to="/movies" className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Film className="h-5 w-5" /><span>{design.labels.movies}</span></Link>
      {sections.some((s) => s.slug === "series" && !s.deleted) ? <Link to="/channels/$section" params={{ section: "series" }} className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Clapperboard className="h-5 w-5" /><span>{design.labels.series}</span></Link> : <span />}
      <Link to="/" className="relative mx-auto -mt-6" aria-label="ALMOGHANI — الرئيسية"><img src={design.images.shield || tplShield} alt="" width={816} height={816} className="h-14 w-14 sm:h-16 sm:w-16" /></Link>
      <Link to="/live" className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Tv className="h-5 w-5" /><span>{design.labels.live}</span></Link>
      <Link to="/" activeOptions={{ exact: true }} className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Home className="h-5 w-5" /><span>{design.labels.home}</span></Link>
    </nav>
  );
}