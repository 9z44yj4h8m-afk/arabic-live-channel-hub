import { Link } from "@tanstack/react-router";
import { Clapperboard, Film, Home, Tv } from "lucide-react";
import tplShield from "@/assets/tpl-shield.png";

export function AppBottomNav() {
  return (
    <nav dir="rtl" className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4.5rem+env(safe-area-inset-bottom))] grid-cols-5 items-center border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="التنقل السريع">
      <Link to="/movies" className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Film className="h-5 w-5" /><span>الأفلام</span></Link>
      <Link to="/channels/$section" params={{ section: "series" }} className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Clapperboard className="h-5 w-5" /><span>المسلسلات</span></Link>
      <Link to="/" className="relative mx-auto -mt-6" aria-label="ALMOGHANI — الرئيسية"><img src={tplShield} alt="" width={816} height={816} className="h-14 w-14 sm:h-16 sm:w-16" /></Link>
      <Link to="/live" className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Tv className="h-5 w-5" /><span>البث المباشر</span></Link>
      <Link to="/" activeOptions={{ exact: true }} className="mobile-nav-item" activeProps={{ className: "text-accent" }}><Home className="h-5 w-5" /><span>الرئيسية</span></Link>
    </nav>
  );
}