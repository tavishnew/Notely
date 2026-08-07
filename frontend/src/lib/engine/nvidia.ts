/* NVIDIA NIM implementation of the Engine interface. Cloud mode, provider
   "nvidia". Talks to the OpenAI-compatible chat completions API at
   integrate.api.nvidia.com via `fetch` — no SDK dependency.

   NIM is chat-only on this endpoint (no first-party transcription / TTS /
   embeddings), so those three methods throw a friendly "unsupported"
   EngineError — callers should check `capabilities()` (or use
   src/lib/engine/router.ts) before calling them. */

import type {
  ChatMessage,
  CompletionOptions,
  Engine,
  EngineCapabilities,
  StructuredOptions,
  TokenHandler,
  TranscriptResult,
  TtsOptions,
} from "./types";
import { EngineError } from "./types";

const BASE_URL = "https://integrate.api.nvidia.com/v1";

/* Models offered in the picker / tier defaults. IDs match the NIM catalog. */
export const NVIDIA_MODELS = [
  "meta/llama-3.1-405b-instruct",
  "nvidia/nemotron-4-340b-instruct",
  "meta/llama-3.1-70b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
] as const;

const UNSUPPORTED_MESSAGE =
  "NVIDIA NIM does not support this operation; use an OpenAI key or local models.";

export class NvidiaEngine implements Engine {
  readonly mode = "cloud" as const;
  readonly provider = "nvidia" as const;

  constructor(
    private readonly apiKey: string,
    private readonly modelOverride?: string,
  ) {}

  capabilities(): EngineCapabilities {
    return { chat: true, transcription: false, tts: false, embeddings: false };
  }

  async complete(opts: CompletionOptions, onToken?: TokenHandler): Promise<string> {
    const res = await this.post("/chat/completions", {
      model: this.resolveModel(opts.tier),
      messages: buildMessages(opts),
      stream: true,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
    }, opts.signal);

    if (!res.body) throw new EngineError("NVIDIA NIM returned an empty stream.", "unknown");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta: string | undefined = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onToken?.(delta);
          }
        } catch {
          /* malformed SSE chunk; skip it */
        }
      }
    }
    return full;
  }

  async structured<T>(opts: StructuredOptions<T>): Promise<T> {
    const res = await this.post("/chat/completions", {
      model: this.resolveModel(opts.tier),
      messages: buildMessages(opts),
      stream: false,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, schema: opts.schema, strict: true },
      },
    }, opts.signal);

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new EngineError("NVIDIA NIM returned no structured content.", "unknown");
    }
    return JSON.parse(content) as T;
  }

  async transcribe(_audio: Blob, _signal?: AbortSignal): Promise<TranscriptResult> {
    throw new EngineError(UNSUPPORTED_MESSAGE, "unsupported");
  }

  async tts(_text: string, _opts: TtsOptions): Promise<Blob> {
    throw new EngineError(UNSUPPORTED_MESSAGE, "unsupported");
  }

  async embed(_texts: string[], _signal?: AbortSignal): Promise<number[][]> {
    throw new EngineError(UNSUPPORTED_MESSAGE, "unsupported");
  }

  async validate(): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/models`, { method: "GET", headers: this.headers() });
    } catch (err) {
      throw toNetworkError(err);
    }
    if (res.status === 401) throw new EngineError("Invalid NVIDIA API key.", "auth");
    if (!res.ok) throw await mapError(res);
  }

  private resolveModel(tier?: "fast" | "strong"): string {
    if (this.modelOverride) return this.modelOverride;
    return tier === "strong"
      ? "meta/llama-3.1-405b-instruct"
      : "nvidia/nemotron-4-340b-instruct";
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async post(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      throw toNetworkError(err);
    }
    if (!res.ok) throw await mapError(res);
    return res;
  }
}

function buildMessages(opts: CompletionOptions): Array<{ role: string; content: string }> {
  const out: Array<{ role: string; content: string }> = [];
  if (opts.system) out.push({ role: "system", content: opts.system });
  for (const m of opts.messages as ChatMessage[]) {
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

function toNetworkError(err: unknown): EngineError {
  if (err instanceof Error && err.name === "AbortError") throw err;
  const message = err instanceof Error ? err.message : "Network request failed.";
  return new EngineError(message, "network");
}

async function mapError(res: Response): Promise<EngineError> {
  let message = res.statusText || "NVIDIA NIM request failed.";
  let code: string | undefined;
  let type: string | undefined;
  try {
    const body = await res.json();
    if (body?.error?.message) message = body.error.message;
    code = body?.error?.code;
    type = body?.error?.type;
  } catch {
    /* body wasn't JSON */
  }
  if (code === "insufficient_quota" || type === "insufficient_quota") {
    return new EngineError(message, "quota");
  }
  if (res.status === 401) return new EngineError(message, "auth");
  if (res.status === 429) return new EngineError(message, "rate_limit");
  if (res.status === 403 || res.status === 404) {
    return new EngineError(message, "model_missing");
  }
  return new EngineError(message, "unknown");
}
