import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { findMatchingChannelIds } from "./channel-search.server.ts";
import { readCatalog, publicCatalogClient } from "./channel-catalog.server";
import { activeChannels } from "./channel-catalog";

const inputSchema = z.object({
  query: z.string().trim().min(2).max(200),
});

export const searchChannelsWithAi = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const catalog = activeChannels((await readCatalog(publicCatalogClient())).entries);
      return { ids: await findMatchingChannelIds(data.query, catalog) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذّر إكمال البحث الذكي.";
      throw new Error(message);
    }
  });