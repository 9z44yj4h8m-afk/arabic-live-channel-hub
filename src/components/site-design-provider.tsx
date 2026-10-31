import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { publishedDesignQuery } from "@/lib/site-design.query";
import { categoryLabelsQuery } from "@/lib/category-labels.query";
import { defaultDesign, resolveDesign, siteDesignSchema, type DesignPage, type DesignSettings } from "@/lib/site-design";

const DesignContext = createContext<DesignSettings>(defaultDesign().global);
export function useSiteDesign() { return useContext(DesignContext); }
export function SiteDesignProvider({ children }: { children: ReactNode }) {
  const { data: published } = useSuspenseQuery(publishedDesignQuery);
  const { data: categoryLabels } = useSuspenseQuery(categoryLabelsQuery);
  const [preview, setPreview] = useState<typeof published>();
  const pathname = useLocation({ select: (location) => location.pathname });
  const page: DesignPage = pathname === "/" ? "home" : pathname === "/movies" ? "movies" : pathname === "/live" ? "live" : pathname === "/channels/movies" ? "movieChannels" : (pathname.split("/")[2] as DesignPage) || "home";
  const supported = pathname === "/" || pathname === "/live" || pathname === "/movies" || pathname.startsWith("/channels/");
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent || window.parent === window || event.data?.type !== "almoghani-design-preview") return;
      const parsed = siteDesignSchema.safeParse(event.data.config);
      if (parsed.success) setPreview(parsed.data);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  const design = preview || published;
  const resolved = resolveDesign(design, page in design.pages ? page : "home");
  const settings = { ...resolved, labels: { ...resolved.labels, ...categoryLabels } };
  const c = settings.colors;
  const font = { original: '"Manrope", "Noto Sans Arabic", sans-serif', arabic: '"Noto Sans Arabic", sans-serif', serif: '"Amiri Quran", serif', system: 'Arial, sans-serif' }[settings.typography.font];
  const style = design.customized && supported ? {
    "--background": c.background, "--surface": c.surface, "--surface-deep": c.background, "--card": c.surface, "--foreground": c.text, "--card-foreground": c.text, "--secondary-foreground": c.text, "--muted-foreground": c.muted, "--primary": c.primary, "--accent": c.primary, "--primary-foreground": c.buttonText, "--accent-foreground": c.buttonText, "--border": c.border, "--input": c.border, "--sky": c.neon,
    "--design-shadow-color": c.shadow, "--design-gradient-end": c.gradientEnd, "--design-font": font, "--font-sans": font, "--font-display": font,
    "--design-size": `${settings.typography.size}px`, "--design-title-size": `${settings.typography.titleSize}px`, "--design-weight": settings.typography.weight, "--design-align": settings.typography.align,
    "--design-width": `${settings.layout.maxWidth}px`, "--design-player-width": `${settings.layout.playerWidth}px`, "--design-ratio": settings.layout.ratio, "--design-gap": `${settings.layout.gap}px`, "--design-radius": `${settings.layout.radius}px`, "--design-card-height": `${settings.layout.cardHeight}px`, "--design-logo-height": `${settings.layout.logoHeight}px`, "--design-columns": settings.layout.columns,
    "--design-glow": `${settings.effects.glow}px`, "--design-shadow": `${settings.effects.shadow}px`, "--design-transition": `${settings.effects.transition}ms`,
  } as CSSProperties : undefined;
  return <DesignContext.Provider value={settings}><div className={supported && design.customized ? "site-design-custom" : undefined} style={style} data-gradient={settings.effects.gradient} data-animation={settings.effects.animation} data-hide-icons={!settings.visible.icons} data-hide-header={!settings.visible.header} data-hide-lists={!settings.visible.lists} data-hide-cards={!settings.visible.cards} data-hide-nav={!settings.visible.nav} data-hide-logo={!settings.visible.logo} data-hide-wolf={!settings.visible.wolf} data-logo-position={settings.layout.logoPosition}>
    {children}
  </div></DesignContext.Provider>;
}

export function DesignElements() {
  const settings = useSiteDesign();
  if (!settings.elements.length) return null;
  return <div className="design-elements mx-auto" style={{ height: settings.layout.stageHeight, maxWidth: settings.layout.maxWidth }} aria-label="عناصر التصميم">
    {settings.elements.map((element) => <div key={element.id} className="design-element" style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.width}%`, height: `${element.height}%`, color: element.color, background: element.background, fontSize: element.fontSize, borderRadius: element.radius }}>
      {element.type === "image" ? (element.image && <img src={element.image} alt={element.text} className="h-full w-full object-contain" />) : element.type === "shape" ? null : <span>{element.text}</span>}
    </div>)}
  </div>;
}