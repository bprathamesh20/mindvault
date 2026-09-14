"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { useChat } from "@ai-sdk/react";
import {
  ArrowLeftIcon,
  BookIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeRail } from "@/components/ThemeRail";
import { ItemModal } from "@/components/ItemModal";
import SignIn from "@/components/SignIn";
import {
  ConvexAskTransport,
  type VaultMessage,
} from "@/lib/ask-transport";
import type { Card } from "@/components/types";

const MODELS = [
  { id: "z-ai/glm-5.3-flash", name: "GLM 5.3 Flash" },
  { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek 4.1 Flash" },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek 4 Flash" },
  { id: "qwen/qwen3.7-flash", name: "Qwen 3.7 Flash" },
];

const SUGGESTIONS = [
  "What did I save this week?",
  "Summarize my recent articles",
  "Any tweets about design?",
  "What have I noted about Convex?",
];

export default function AskPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(MODELS[0].id);
  const [open, setOpen] = useState<{ id: string; preview?: Card } | null>(null);

  const transport = useMemo(() => new ConvexAskTransport(convex), [convex]);
  const { messages, sendMessage, setMessages, status, stop, error, clearError } =
    useChat<VaultMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    void sendMessage({ text: q }, { body: { model } });
    setInput("");
  }

  function onSubmit(message: PromptInputMessage) {
    submit(message.text);
  }

  function openItem(card: Card) {
    setOpen({ id: card.id, preview: card });
  }

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Backend not connected yet. Run{" "}
          <code className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[13px] dark:bg-stone-800">
            npx convex dev
          </code>{" "}
          in <code className="font-mono text-[13px]">apps/web</code>, then
          reload.
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex h-dvh flex-col md:pl-16">
        <div className="flex-1" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <TooltipProvider>
      <main className="flex h-dvh flex-col md:pl-16">
        <ThemeRail />

        <header className="flex items-center justify-between px-5 pt-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs tracking-wide text-stone-400 transition hover:text-stone-600 dark:text-[#6b6b75] dark:hover:text-stone-300"
          >
            <ArrowLeftIcon className="size-3.5" />
            Vault
          </Link>
          <h1 className="font-serif text-xl italic text-stone-600 dark:text-stone-300">
            ask my vault
          </h1>
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              clearError();
            }}
            disabled={messages.length === 0}
            title="New conversation"
            className="flex items-center gap-1.5 text-xs tracking-wide text-stone-400 transition hover:text-stone-600 disabled:opacity-0 dark:text-[#6b6b75] dark:hover:text-stone-300"
          >
            <RotateCcwIcon className="size-3.5" />
            New
          </button>
        </header>

        <Conversation className="mx-auto w-full max-w-2xl">
          <ConversationContent className="px-5 py-8">
            {messages.length === 0 ? (
              <ConversationEmptyState>
                <SparklesIcon className="size-8 text-stone-300 dark:text-[#55555e]" />
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">
                    Ask your vault anything
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Answers are grounded in the memories you&rsquo;ve saved —
                    articles, posts, notes and more.
                  </p>
                </div>
                <div className="mt-3 flex max-w-md flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <Suggestion key={s} suggestion={s} onClick={submit} />
                  ))}
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  {message.role === "assistant" && (
                    <AssistantSources
                      message={message}
                      onOpen={openItem}
                    />
                  )}
                  <MessageContent>
                    {message.parts.map((part, i) =>
                      part.type === "text" ? (
                        <MessageResponse key={`${message.id}-${i}`}>
                          {part.text}
                        </MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                </Message>
              ))
            )}

            {status === "submitted" ? (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer className="text-sm">
                    Searching your vault…
                  </Shimmer>
                </MessageContent>
              </Message>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {error ? (
          <p className="mx-auto w-full max-w-2xl px-5 pb-2 text-xs text-red-500">
            {error.message || "Something went wrong."}
          </p>
        ) : null}

        <div className="px-4 pb-5 pt-1">
          <PromptInput
            onSubmit={onSubmit}
            className="mx-auto w-full max-w-2xl"
          >
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Ask your vault…"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputSelect
                  value={model}
                  onValueChange={(v) => setModel(String(v))}
                >
                  <PromptInputSelectTrigger className="w-auto gap-1.5 text-xs">
                    <PromptInputSelectValue>
                      {MODELS.find((m) => m.id === model)?.name ?? model}
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {MODELS.map((m) => (
                      <PromptInputSelectItem key={m.id} value={m.id}>
                        {m.name}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
              <PromptInputSubmit
                status={status}
                onStop={stop}
                disabled={!busy && !input.trim()}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {open ? (
          <ItemModal
            itemId={open.id}
            preview={open.preview}
            onClose={() => setOpen(null)}
          />
        ) : null}
      </main>
    </TooltipProvider>
  );
}

function AssistantSources({
  message,
  onOpen,
}: {
  message: VaultMessage;
  onOpen: (card: Card) => void;
}) {
  const part = message.parts.find((p) => p.type === "data-vault-sources");
  const cards = part?.type === "data-vault-sources" ? part.data : undefined;
  if (!cards || cards.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={cards.length}>
        <p className="font-medium">
          {cards.length} {cards.length === 1 ? "memory" : "memories"}
        </p>
      </SourcesTrigger>
      <SourcesContent className="flex-row flex-wrap">
        {cards.map((card) => (
          <Source
            key={card.id}
            href={card.url ?? "#"}
            title={card.title ?? card.sourceDomain ?? "memory"}
            onClick={(e) => {
              e.preventDefault();
              onOpen(card);
            }}
          >
            <span className="flex items-center gap-2 rounded-full border border-stone-200 py-1 pl-1 pr-3 text-stone-600 transition hover:border-stone-400 dark:border-[#2a2a31] dark:text-stone-300 dark:hover:border-[#5b5b64]">
              {card.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.thumbnailUrl}
                  alt=""
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <BookIcon className="ml-1 size-3.5 text-stone-400" />
              )}
              <span className="max-w-44 truncate text-xs font-medium">
                {card.title ?? card.sourceDomain ?? card.type}
              </span>
            </span>
          </Source>
        ))}
      </SourcesContent>
    </Sources>
  );
}
