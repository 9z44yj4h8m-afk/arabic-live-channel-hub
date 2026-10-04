import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./ai/run-id.server.ts";

type SearchableChannel = {
  id: string;
  name: string;
  category: string;
  description: string;
};

export async function findMatchingChannelIds(query: string, channels: SearchableChannel[]) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("خدمة البحث الذكي غير مهيأة حاليًا.");

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  const catalog = channels
    .map((channel) => `${channel.id}\t${channel.name}\t${channel.category}\t${channel.description}`)
    .join("\n");

  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system:
      "أنت محرك مطابقة للقنوات. طابق طلب المستخدم دلاليًا مع القائمة المقدمة فقط. أعد معرّفات القنوات المطابقة مرتبة، كل معرّف في سطر مستقل. لا تكتب شرحًا ولا علامات ترقيم. إذا لم توجد مطابقة مناسبة، أعد NONE فقط. لا تخترع قناة أو معرّفًا.",
    prompt: `طلب المستخدم: ${query}\n\nالقنوات المتاحة (المعرّف، الاسم، القسم، الوصف):\n${catalog}`,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = await result.text;
  const knownIds = new Set(channels.map((channel) => channel.id));
  return Array.from(
    new Set(
      text
        .split(/\s+/)
        .map((id) => id.trim())
        .filter((id) => knownIds.has(id)),
    ),
  );
}