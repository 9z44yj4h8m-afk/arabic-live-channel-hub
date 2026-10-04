import { useChat } from "@ai-sdk/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import kaabaEmblem from "@/assets/kaaba-emblem.jpg";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";

const STORAGE_KEY = "almoghani-chat-v1";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "ALMOGHANI AI — مساعد ذكي" },
      { name: "description", content: "تحدث كتابيًا مع ALMOGHANI AI واسأله عن أي شيء." },
      { property: "og:title", content: "ALMOGHANI AI — مساعد ذكي" },
      { property: "og:description", content: "شات ذكاء اصطناعي باللغة العربية داخل موقع المغني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = ["ما فضل أذكار الصباح؟", "لخّص لي سورة الكهف", "اقترح لي قناة إخبارية أتابعها"];

function ChatPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const { messages, setMessages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => setError(e.message || "تعذّر الاتصال، تحقق من الإنترنت وحاول مرة أخرى."),
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved) as UIMessage[]);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [setMessages]);

  useEffect(() => {
    if (ready && status !== "streaming" && status !== "submitted") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, status, ready]);

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy) return;
    setError("");
    sendMessage({ text: text.trim() });
  }

  function handleSubmit(message: PromptInputMessage) {
    send(message.text);
  }

  return (
    <div dir="rtl" className="flex h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <img src={kaabaEmblem} alt="" width={816} height={816} className="h-10 w-10 rounded-full border border-primary object-cover" />
            <div>
              <h1 className="font-display text-base font-black">ALMOGHANI AI</h1>
              <p className="text-xs text-muted-foreground">مساعدك الذكي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => { stop(); setMessages([]); localStorage.removeItem(STORAGE_KEY); setError(""); }}
                className="flex items-center gap-1.5 rounded-md border border-primary/60 px-3 py-1.5 text-sm font-bold hover:border-sky"
              >
                <RotateCcw className="h-4 w-4" />محادثة جديدة
              </button>
            )}
            <Link to="/" className="icon-button" aria-label="الرئيسية"><ArrowRight className="h-5 w-5" /></Link>
          </div>
        </div>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <img src={kaabaEmblem} alt="" width={816} height={816} className="h-20 w-20 rounded-3xl object-cover" />
              <h2 className="text-xl font-black">أهلًا بك، كيف أقدر أساعدك؟</h2>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="portal-frame px-4 py-2 text-sm font-bold">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent text-foreground"}>
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse
                          key={i}
                          components={{
                            a: (props: { href?: string | undefined; children?: React.ReactNode }) => {
                              const href = props.href;
                              const children = props.children;
                              return href?.startsWith("/") && !href.startsWith("//") ? (
                                <a href={href} className="font-bold text-sky underline underline-offset-4 hover:text-primary">{children}</a>
                              ) : (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-sky underline">{children}</a>
                              );
                            },
                          } as never}
                        >
                          {part.text}
                        </MessageResponse>
                      ) : <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && <Shimmer className="text-sm">يفكّر الآن…</Shimmer>}
          {error && <p role="alert" className="text-sm font-bold text-signal">{error}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PromptInput onSubmit={handleSubmit} className="portal-frame">
          <PromptInputTextarea placeholder="اكتب رسالتك هنا…" autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
