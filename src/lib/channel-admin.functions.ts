import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminSession, passwordMatches, passwordVersion } from "./channel-admin.server";

export const getAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const session = await adminSession();
  return { unlocked: session.data.unlocked === true && session.data.passwordVersion === passwordVersion() };
});

export const unlockAdmin = createServerFn({ method: "POST" })
  .inputValidator(z.object({ password: z.string().min(1).max(128) }))
  .handler(async ({ data }) => {
    const expected = process.env["CHANNEL_ADMIN_PASSWORD"];
    if (!expected) throw new Error("تعذّر فتح لوحة الإدارة.");
    if (!passwordMatches(data.password, expected)) return { ok: false };
    const session = await adminSession();
    await session.update({ unlocked: true, passwordVersion: passwordVersion() });
    return { ok: true };
  });

export const lockAdmin = createServerFn({ method: "POST" }).handler(async () => {
  await (await adminSession()).clear();
  return { ok: true };
});