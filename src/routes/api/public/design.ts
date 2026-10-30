import { createFileRoute } from "@tanstack/react-router";
import { readPublishedDesign } from "@/lib/site-design.server";
export const Route = createFileRoute("/api/public/design")({ server: { handlers: { GET: async () => {
  try { return Response.json(await readPublishedDesign(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "تعذّر تحميل التصميم" }, { status: 503 }); }
} } } });