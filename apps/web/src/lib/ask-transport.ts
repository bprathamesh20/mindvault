import type {
  ChatRequestOptions,
  ChatTransport,
  UIMessage,
  UIMessageChunk,
} from "ai";
import type { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Card } from "../components/types";

export type VaultDataTypes = { "vault-sources": Card[] };
export type VaultMessage = UIMessage<unknown, VaultDataTypes>;
type Chunk = UIMessageChunk<unknown, VaultDataTypes>;

type AskResult = { answer: string; sources: Card[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// Split on word-ish boundaries so the reveal feels like real streaming.
function chunkAnswer(answer: string): string[] {
  const pieces: string[] = [];
  let cur = "";
  for (const token of answer.split(/(\s+)/)) {
    cur += token;
    if (cur.length >= 22) {
      pieces.push(cur);
      cur = "";
    }
  }
  if (cur) pieces.push(cur);
  return pieces;
}

/**
 * Drives useChat from the Convex `askVault` action. The action resolves with
 * the full answer; we re-emit it as text deltas so the UI reads like a live
 * stream, and attach the retrieved memories as a `data-vault-sources` part.
 */
export class ConvexAskTransport implements ChatTransport<VaultMessage> {
  constructor(private readonly convex: ConvexReactClient) {}

  sendMessages = async ({
    messages,
    abortSignal,
    body,
  }: Parameters<
    ChatTransport<VaultMessage>["sendMessages"]
  >[0]): Promise<ReadableStream<Chunk>> => {
    const model = (body as { model?: string } | undefined)?.model;

    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
    const q = lastUserIndex >= 0 ? textOf(messages[lastUserIndex]) : "";
    const history = messages.slice(0, Math.max(0, lastUserIndex)).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: textOf(m),
    }));

    const textId = `text-${Math.random().toString(36).slice(2)}`;
    const convex = this.convex;

    return new ReadableStream<Chunk>({
      async start(controller) {
        const aborted = () => {
          if (!abortSignal?.aborted) return false;
          controller.enqueue({ type: "abort" });
          controller.close();
          return true;
        };
        try {
          const result = (await convex.action(api.ask.askVault, {
            q,
            model,
            history,
          })) as AskResult;
          if (aborted()) return;

          controller.enqueue({ type: "start" });
          controller.enqueue({ type: "text-start", id: textId });

          const pieces = chunkAnswer(result.answer);
          const delay = Math.min(30, Math.max(8, 1600 / pieces.length));
          for (const piece of pieces) {
            if (aborted()) return;
            controller.enqueue({ type: "text-delta", id: textId, delta: piece });
            await sleep(delay);
          }
          controller.enqueue({ type: "text-end", id: textId });

          if (result.sources.length > 0) {
            controller.enqueue({
              type: "data-vault-sources",
              id: `src-${textId}`,
              data: result.sources,
            });
          }
          controller.enqueue({ type: "finish" });
          controller.close();
        } catch (e) {
          if (aborted()) return;
          controller.enqueue({
            type: "error",
            errorText:
              e instanceof Error ? e.message : "Could not reach the vault.",
          });
          controller.close();
        }
      },
    });
  };

  reconnectToStream = async (
    _options: {
      chatId: string;
      abortSignal?: AbortSignal;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<Chunk> | null> => null;
}
