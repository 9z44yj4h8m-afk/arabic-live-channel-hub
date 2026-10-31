import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { siteSession, siteUnlocked, siteVersion } from "./site-gate.server";
import { passwordMatches } from "./channel-admin.server";

export const getSiteAccess = createServerFn({ method: "GET" }).handler(async () => ({ unlocked: await siteUnlocked() }));
export const unlockSite = createServerFn({ method: "POST" }).inputValidator(z.object({ password: z.string().min(1).max(128) })).handler(async ({ data }) => {
  const expected = process.env["SITE_PASSWORD"];
  if (!expected || !passwordMatches(data.password, expected)) return { ok: false };
  await (await siteSession()).update({ version: siteVersion() });
  return { ok: true };
});
export const lockSite = createServerFn({ method: "POST" }).handler(async () => { await (await siteSession()).clear(); return { ok: true }; });